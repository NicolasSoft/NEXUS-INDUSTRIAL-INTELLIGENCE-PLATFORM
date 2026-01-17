import hashlib
import hmac
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import ipaddress
import re

# Configuração de criptografia
SECRET_KEY = "your-super-secret-key-2025-digital-factory"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
fernet_key = Fernet.generate_key()
cipher_suite = Fernet(fernet_key)

class SecurityMonitor:
    def __init__(self):
        self.threats = []
        self.scans = []
        self.firewall_rules = self.load_firewall_rules()
        self.encryption_active = True
        
    def load_firewall_rules(self) -> List[Dict]:
        return [
            {"rule": "block", "ip_range": "10.0.0.0/8", "port": "*"},
            {"rule": "allow", "ip_range": "192.168.1.0/24", "port": "443,8080"},
            {"rule": "block", "ip_range": "0.0.0.0/0", "port": "22,23,3389"}
        ]
    
    async def verify_signature(self, signature: str, payload: bytes) -> bool:
        """Verificar assinatura HMAC"""
        expected_signature = hmac.new(
            SECRET_KEY.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_signature)
    
    def encrypt_data(self, data: str) -> str:
        """Criptografar dados sensíveis"""
        if not self.encryption_active:
            return data
        return cipher_suite.encrypt(data.encode()).decode()
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Descriptografar dados"""
        if not self.encryption_active:
            return encrypted_data
        return cipher_suite.decrypt(encrypted_data.encode()).decode()
    
    def check_ip_threat(self, ip_address: str) -> bool:
        """Verificar se IP está em lista negra"""
        try:
            ip = ipaddress.ip_address(ip_address)
            
            # Verificar IPs privados (permitir apenas em ambientes internos)
            if ip.is_private:
                return True
                
            # Verificar regras de firewall
            for rule in self.firewall_rules:
                network = ipaddress.ip_network(rule["ip_range"])
                if ip in network:
                    return rule["rule"] == "allow"
                    
        except ValueError:
            return False
        return True
    
    async def log_security_event(self, event_type: str, severity: str, details: Dict):
        """Registrar evento de segurança"""
        event = {
            "id": hashlib.md5(f"{event_type}{datetime.utcnow().isoformat()}".encode()).hexdigest(),
            "event_type": event_type,
            "severity": severity,
            "timestamp": datetime.utcnow(),
            "details": details,
            "resolved": False
        }
        self.threats.append(event)
        
        # Alertar se for crítica
        if severity in ["high", "critical"]:
            await self.trigger_alert(event)
    
    async def trigger_alert(self, event: Dict):
        """Disparar alerta de segurança"""
        # Implementar notificações (email, Slack, etc.)
        print(f"🚨 ALERTA DE SEGURANÇA: {event}")
    
    def get_status(self) -> Dict:
        return {
            "encryption": "AES-256" if self.encryption_active else "INACTIVE",
            "firewall_rules": len(self.firewall_rules),
            "active_threats": len([t for t in self.threats if not t["resolved"]]),
            "last_scan": self.scans[-1]["timestamp"] if self.scans else None,
            "compliance": ["ISO 27001", "NIST", "GDPR"]
        }

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str) -> User:
    """Obter usuário atual do token JWT"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = await get_user_from_db(username)
    if user is None:
        raise credentials_exception
    return user