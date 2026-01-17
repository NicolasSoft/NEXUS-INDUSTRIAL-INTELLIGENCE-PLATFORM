from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import asyncio
import json
import logging
from pathlib import Path

# Importações customizadas
# Nota: Assumindo que os módulos ml.* estão no PYTHONPATH ou na mesma pasta.
# Ajuste conforme sua estrutura de pastas real (ex: from ml.auth import ...)
try:
    from ml.auth import auth_router
except ImportError:
    from auth import auth_router # Fallback se estiver na mesma pasta
from models import TelemetryData, User, Alert, Device, Token
from database import init_db, get_db
from mqtt_client import MQTTClientManager
from anomaly_detection import AnomalyDetector
from security import SecurityMonitor, get_current_user, create_access_token, verify_password, get_password_hash
from ai_engine import AIEngine
from cache import RedisCache
from metrics import MetricsCollector

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Digital Factory IoT Platform",
    description="Industrial IoT Monitoring with AI and Cybersecurity",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_tags=[
        {"name": "auth", "description": "Authentication and authorization"},
        {"name": "telemetry", "description": "IoT device data"},
        {"name": "analytics", "description": "AI-powered analytics"},
        {"name": "security", "description": "Cybersecurity features"},
        {"name": "monitoring", "description": "System monitoring"}
    ]
)

# Registrar rotas
app.include_router(auth_router)

# Middlewares de segurança
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.yourdomain.com"]
)

# Servir arquivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")

# Estado global
mqtt_manager = MQTTClientManager()
anomaly_detector = AnomalyDetector()
security_monitor = SecurityMonitor()
ai_engine = AIEngine()
cache = RedisCache()
metrics_collector = MetricsCollector()

# Conexões WebSocket ativas
active_connections: List[WebSocket] = []

# Evento de inicialização
@app.on_event("startup")
async def startup_event():
    """Inicialização do sistema"""
    await init_db()
    mqtt_manager.start()
    await anomaly_detector.load_model()
    await ai_engine.initialize()
    await cache.connect()
    logger.info("✅ Sistema inicializado - IoT Platform 2025")
    logger.info(f"📊 Modelo de IA carregado: {anomaly_detector.model_accuracy:.1%} accuracy")
    logger.info("🛡️  Sistema de cibersegurança ativo")

@app.on_event("shutdown")
async def shutdown_event():
    """Limpeza ao desligar"""
    await cache.disconnect()
    logger.info("🔴 Sistema desligando...")

# ===== ENDPOINTS DE AUTENTICAÇÃO =====
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

@app.post("/api/auth/token", response_model=Token, tags=["auth"])
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Autenticação JWT"""
    user = await get_user_from_db(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Verificar se o usuário está ativo
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuário desativado")
    
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "scopes": user.scopes}
    )
    
    # Log de acesso
    await security_monitor.log_access_attempt(user.username, "SUCCESS")
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/register", tags=["auth"])
async def register(user: User):
    """Registrar novo usuário"""
    # Verificar se usuário já existe
    existing_user = await get_user_from_db(user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Usuário já existe")
    
    # Hash da senha
    hashed_password = get_password_hash(user.password)
    
    # Criar usuário no banco
    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role="operator",  # Default role
        scopes=["read:telemetry"],
        is_active=True
    )
    
    await save_user_to_db(new_user)
    
    return {"message": "Usuário criado com sucesso"}

# ===== ENDPOINTS DE TELEMETRIA =====
@app.get("/api/telemetry/latest", tags=["telemetry"])
async def get_latest_telemetry(
    device_id: Optional[str] = Query(None, description="ID do dispositivo"),
    current_user: User = Depends(get_current_user)
):
    """Obter última leitura de telemetria"""
    if device_id:
        data = await mqtt_manager.get_device_telemetry(device_id)
    else:
        data = await mqtt_manager.get_latest_telemetry()
    
    if not data:
        raise HTTPException(status_code=404, detail="Nenhuma telemetria disponível")
    
    # Análise de anomalias em tempo real
    anomaly_result = await anomaly_detector.analyze(data)
    data["anomaly"] = anomaly_result["is_anomaly"]
    data["anomaly_score"] = anomaly_result["score"]
    data["health_score"] = await ai_engine.calculate_health_score(data)
    
    return data

@app.get("/api/telemetry/history", tags=["telemetry"])
async def get_telemetry_history(
    device_id: str,
    start_time: datetime,
    end_time: Optional[datetime] = None,
    limit: int = 1000,
    current_user: User = Depends(get_current_user)
):
    """Obter histórico de telemetria"""
    # Simulação - em produção, buscar do banco de dados
    cache_key = f"telemetry:{device_id}:{start_time.isoformat()}"
    history = await cache.get(cache_key)
    
    if not history:
        history = generate_simulated_history(device_id, start_time, end_time, limit)
        await cache.set(cache_key, history, expire=300)
    
    return history

@app.post("/api/telemetry/simulate", tags=["telemetry"])
async def simulate_telemetry(
    count: int = 100,
    anomaly_rate: float = 0.1,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Gerar dados de telemetria simulados (para testes)"""
    background_tasks.add_task(
        generate_simulation_data,
        count=count,
        anomaly_rate=anomaly_rate
    )
    return {"message": f"Simulação iniciada para {count} amostras"}

# ===== ENDPOINTS DE ANÁLISE COM IA =====
@app.post("/api/ai/analyze", tags=["analytics"])
async def analyze_with_ai(
    data: Dict,
    analysis_type: str = "all",
    current_user: User = Depends(get_current_user)
):
    """Análise avançada com IA"""
    if analysis_type == "predictive":
        result = await ai_engine.predict_failure(data)
    elif analysis_type == "pattern":
        result = await ai_engine.detect_patterns(data)
    elif analysis_type == "optimization":
        result = await ai_engine.optimize_parameters(data)
    else:
        result = await ai_engine.comprehensive_analysis(data)
    
    return result

@app.get("/api/ai/performance", tags=["analytics"])
async def get_ai_performance():
    """Métricas de performance do modelo de IA"""
    return {
        "accuracy": anomaly_detector.model_accuracy,
        "precision": anomaly_detector.precision,
        "recall": anomaly_detector.recall,
        "f1_score": anomaly_detector.f1_score,
        "last_trained": anomaly_detector.last_trained,
        "training_samples": anomaly_detector.training_samples
    }

# ===== ENDPOINTS DE CIBERSEGURANÇA =====
@app.get("/api/security/status", tags=["security"])
async def get_security_status(current_user: User = Depends(get_current_user)):
    """Status de segurança do sistema"""
    status = await security_monitor.get_status()
    return status

@app.get("/api/security/threats", tags=["security"])
async def get_recent_threats(
    hours: int = 24,
    current_user: User = Depends(get_current_user)
):
    """Ameaças de segurança recentes"""
    threats = await security_monitor.get_recent_threats(hours)
    return threats

@app.post("/api/security/scan", tags=["security"])
async def run_security_scan(
    scan_type: str = "quick",
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Executar varredura de segurança"""
    background_tasks.add_task(security_monitor.run_scan, scan_type)
    return {"message": f"Varredura {scan_type} iniciada"}

# ===== WEBHOOKS PARA INTEGRAÇÃO =====
@app.post("/api/webhooks/azure")
async def azure_webhook(payload: Dict):
    """Webhook para integração com Azure IoT Hub"""
    # Verificar assinatura
    signature = payload.get("signature")
    if not security_monitor.verify_signature(signature):
        raise HTTPException(status_code=401, detail="Assinatura inválida")
    
    # Processar dados do Azure
    await process_azure_data(payload["data"])
    
    return {"status": "processed"}

@app.post("/api/webhooks/splunk")
async def splunk_webhook(payload: Dict):
    """Webhook para integração com Splunk"""
    # Processar logs de segurança
    await security_monitor.process_splunk_logs(payload)
    
    return {"status": "logs_received"}

# ===== WEBSOCKET PARA DADOS EM TEMPO REAL =====
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """WebSocket para streaming de telemetria em tempo real"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # Enviar dados a cada segundo
            telemetry = await mqtt_manager.get_latest_telemetry()
            
            if telemetry:
                # Análise em tempo real
                anomaly_result = await anomaly_detector.analyze(telemetry)
                telemetry["anomaly"] = anomaly_result["is_anomaly"]
                telemetry["anomaly_score"] = anomaly_result["score"]
                
                await websocket.send_json(telemetry)
            
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        logger.error(f"Erro no WebSocket: {e}")
        active_connections.remove(websocket)

@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket para alertas em tempo real"""
    await websocket.accept()
    
    try:
        while True:
            # Verificar novos alertas
            new_alerts = await security_monitor.get_new_alerts()
            for alert in new_alerts:
                await websocket.send_json(alert)
            
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        pass

# ===== ENDPOINTS DE MONITORAMENTO DO SISTEMA =====
@app.get("/api/health", tags=["monitoring"])
async def health_check():
    """Health check do sistema"""
    status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "mqtt": mqtt_manager.is_connected(),
            "database": await check_database_health(),
            "cache": await cache.is_healthy(),
            "ai_model": anomaly_detector.is_loaded(),
            "security_monitor": security_monitor.is_running()
        },
        "metrics": {
            "active_connections": len(active_connections),
            "messages_processed": metrics_collector.get_counter("messages_processed"),
            "anomalies_detected": metrics_collector.get_counter("anomalies_detected")
        }
    }
    return status

@app.get("/api/metrics", tags=["monitoring"])
async def get_metrics():
    """Métricas do sistema (formato Prometheus)"""
    return metrics_collector.get_metrics()

# ===== FUNÇÕES AUXILIARES =====
async def broadcast_telemetry(telemetry: Dict):
    """Transmitir telemetria para todas as conexões WebSocket"""
    for connection in active_connections:
        try:
            await connection.send_json(telemetry)
        except Exception as e:
            logger.error(f"Erro ao enviar para WebSocket: {e}")
            active_connections.remove(connection)

async def generate_simulation_data(count: int, anomaly_rate: float):
    """Gerar dados de simulação para testes"""
    for i in range(count):
        data = {
            "device_id": f"device_{i % 12}",
            "temperature": 70 + (random.random() * 20 - 10),
            "vibration": 0.02 + (random.random() * 0.03 * (1 if random.random() > anomaly_rate else 5)),
            "rpm": 1500 + (random.random() * 100 - 50),
            "pressure": 100 + (random.random() * 20),
            "power_consumption": 2.4 + (random.random() * 1),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Detectar anomalia
        anomaly_result = await anomaly_detector.analyze(data)
        data["anomaly"] = anomaly_result["is_anomaly"]
        
        # Armazenar no cache
        await cache.set(f"telemetry:{data['device_id']}:latest", data, expire=60)
        
        # Broadcast via WebSocket
        await broadcast_telemetry(data)
        
        await asyncio.sleep(0.1)

# Função principal
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        ssl_keyfile="key.pem",
        ssl_certfile="cert.pem"
    )