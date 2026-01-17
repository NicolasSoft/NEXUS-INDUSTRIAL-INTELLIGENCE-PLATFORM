// app.js - Dashboard IoT com todas dependências funcionais
import { FakeWebSocket } from "./websocket.js";
import { detectAnomaly, calculateHealthScore } from "./sensors.js";
import { createTempChart, updateTempChart } from "./charts.js";
import { drawVibrationChart, drawEnergyChart, drawNetworkChart } from "./canvasChart.js";
import { getCurrentUser, logout, requireAuth, isTokenExpiringSoon } from "./auth.js";
import { simulateThreatDetection, firewallCheck } from "./cybersecurity.js";

// VERIFICAÇÃO DE AUTENTICAÇÃO
if (!requireAuth()) {
  throw new Error('Usuário não autenticado');
}

// CONFIGURAÇÃO
const HISTORY_SIZE = 30;
const tempHistory = [];
const vibrationHistory = [];
const energyHistory = [];
const alerts = [];
let lastData = {};

// ELEMENTOS DOM
const elements = {
  temp: document.getElementById("temp"),
  vibration: document.getElementById("vibration"),
  rpm: document.getElementById("rpm"),
  statusText: document.getElementById("statusText") || document.getElementById("status"),
  statusDot: document.getElementById("statusDot"),
  healthScore: document.getElementById("healthScore"),
  alertList: document.getElementById("alertList"),
  alertCount: document.getElementById("alertCount"),
  userName: document.getElementById("userName"),
  userRole: document.getElementById("userRole"),
  logoutBtn: document.getElementById("logoutBtn"),
  lastScan: document.getElementById("lastScan"),
  nextMaintenance: document.getElementById("nextMaintenance"),
  maintenanceProgress: document.getElementById("maintenanceProgress")
};

// GRÁFICOS
let tempChart = null;

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', initializeDashboard);

function initializeDashboard() {
  console.log('🚀 Dashboard IoT inicializando...');
  
  // Debug: verificar elementos do DOM
  console.log('📍 Elementos do DOM:');
  console.log('- sidebarToggle:', document.getElementById('sidebarToggle'));
  console.log('- sidebar:', document.getElementById('sidebar'));
  console.log('- menu items:', document.querySelectorAll('.sidebar-menu li a').length);
  
  // Verificar se token está prestes a expirar
  checkTokenExpiry();
  
  // Configurar usuário
  setupUserInfo();
  
  // Configurar logout
  setupLogout();
  
  // Configurar botões do sidebar
  setupSidebarButtons();
  
  // Inicializar gráficos
  initializeCharts();
  
  // Iniciar simulação de dados
  startDataSimulation();
  
  // Iniciar monitoramento de segurança
  startSecurityMonitoring();
  
  console.log('✅ Dashboard pronto!');
}

// Verificar expiração do token
function checkTokenExpiry() {
  if (isTokenExpiringSoon()) {
    showNotification('Sua sessão expirará em breve. Faça login novamente para continuar.', 'warning');
  }
}

// Configurar informações do usuário
function setupUserInfo() {
  const user = getCurrentUser();
  if (user) {
    if (elements.userName) {
      elements.userName.textContent = user.name || user.username;
    }
    if (elements.userRole) {
      elements.userRole.textContent = 
        user.role === 'admin' ? 'Administrador' : 
        user.role === 'operator' ? 'Operador' : 
        'Visualizador';
      
      // Estilo baseado no role
      if (user.role === 'admin') {
        elements.userRole.style.background = 'rgba(255, 0, 60, 0.2)';
        elements.userRole.style.color = '#ff003c';
        elements.userRole.style.borderColor = 'rgba(255, 0, 60, 0.3)';
      }
    }
  }
}

// Configurar logout
function setupLogout() {
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

// Configurar botões do sidebar
function setupSidebarButtons() {
  // Aguardar um pouco para garantir que o DOM está pronto
  setTimeout(() => {
    // Toggle do sidebar
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle('collapsed');
        sidebarToggle.style.transform = sidebar.classList.contains('collapsed') 
          ? 'rotate(180deg)' 
          : 'rotate(0deg)';
        console.log('🔄 Sidebar toggle clicado, collapsed:', sidebar.classList.contains('collapsed'));
      });
      sidebarToggle.hasListener = true;
      console.log('✅ Sidebar toggle configurado');
    } else {
      console.warn('⚠️ Sidebar ou toggle não encontrado', {sidebarToggle, sidebar});
    }
    
    // Menu items
    const menuItems = document.querySelectorAll('.sidebar-menu li a');
    if (menuItems.length === 0) {
      console.warn('⚠️ Nenhum menu item encontrado');
      return;
    }
    
    menuItems.forEach((item, index) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log(`🔗 Menu item ${index} clicado`);
        
        // Remover active de todos os itens
        document.querySelectorAll('.sidebar-menu li').forEach(li => {
          li.classList.remove('active');
        });
        
        // Adicionar active ao item clicado
        const parent = item.closest('li');
        if (parent) {
          parent.classList.add('active');
          
          // Aqui você pode adicionar lógica de navegação
          const page = parent.dataset.page;
          console.log(`📄 Navegando para: ${page}`);
        }
      });
    });
    console.log(`✅ ${menuItems.length} menu items configurados`);
  }, 100);
}

// Inicializar gráficos
function initializeCharts() {
  const tempCtx = document.getElementById('tempChart');
  const vibrationCtx = document.getElementById('vibrationChart');
  const energyCtx = document.getElementById('energyChart');
  const networkCtx = document.getElementById('networkChart');
  
  if (tempCtx) {
    tempChart = createTempChart(tempCtx.getContext('2d'));
  }
  
  // Inicializar com dados zerados
  for (let i = 0; i < HISTORY_SIZE; i++) {
    tempHistory.push(0);
    vibrationHistory.push(0);
    energyHistory.push(50 + Math.random() * 30);
  }
  
  if (tempChart && tempHistory.length > 0) {
    updateTempChart(tempChart, 0);
  }
  
  if (vibrationCtx) {
    drawVibrationChart(vibrationCtx, vibrationHistory);
  }
  
  if (energyCtx) {
    drawEnergyChart(energyCtx, energyHistory);
  }
  
  if (networkCtx) {
    drawNetworkChart(networkCtx);
  }
}

// Simulação de dados
function startDataSimulation() {
  // Dados iniciais
  lastData = {
    temperature: 72.5 + Math.random() * 5,
    vibration: 0.35 + Math.random() * 0.1,
    rpm: 1520 + Math.random() * 40,
    pressure: 1.2 + Math.random() * 0.2,
    timestamp: Date.now()
  };
  
  // Atualizar dados a cada 2 segundos
  setInterval(() => {
    updateSimulatedData();
    processData(lastData);
  }, 2000);
  
  // Processar dados iniciais
  processData(lastData);
}

function updateSimulatedData() {
  // Variação mais realista
  const variation = {
    temperature: (Math.random() - 0.5) * 1.5,
    vibration: (Math.random() - 0.5) * 0.08,
    rpm: (Math.random() - 0.5) * 30,
    pressure: (Math.random() - 0.5) * 0.15
  };
  
  // Aplicar variação com limites
  lastData.temperature = Math.max(60, Math.min(90, 
    lastData.temperature + variation.temperature
  ));
  
  lastData.vibration = Math.max(0.1, Math.min(0.8,
    lastData.vibration + variation.vibration
  ));
  
  lastData.rpm = Math.max(1200, Math.min(1800,
    lastData.rpm + variation.rpm
  ));
  
  lastData.pressure = Math.max(0.8, Math.min(1.5,
    lastData.pressure + variation.pressure
  ));
  
  lastData.timestamp = Date.now();
}

// Processar dados
function processData(data) {
  // Atualizar históricos
  updateHistory(data);
  
  // Calcular health score
  const healthScore = calculateHealthScore(data);
  
  // Verificar anomalias
  const anomaly = detectAnomaly(data);
  
  // Atualizar UI
  updateMetrics(data, healthScore);
  updateCharts();
  updateSystemStatus(anomaly, healthScore);
  
  // Verificar anomalias
  if (anomaly) {
    generateAlert(data, anomaly);
  }
  
  // Atualizar preditiva
  updatePredictive(data);
}

function updateHistory(data) {
  // Atualizar arrays de histórico
  tempHistory.shift();
  tempHistory.push(data.temperature);
  
  vibrationHistory.shift();
  vibrationHistory.push(data.vibration);
  
  energyHistory.shift();
  energyHistory.push(50 + Math.random() * 40);
}

function updateMetrics(data, healthScore) {
  // Atualizar valores numéricos
  if (elements.temp) {
    elements.temp.textContent = `${data.temperature.toFixed(1)} °C`;
    animateValue(elements.temp);
  }
  
  if (elements.vibration) {
    elements.vibration.textContent = data.vibration.toFixed(3);
    animateValue(elements.vibration);
  }
  
  if (elements.rpm) {
    elements.rpm.textContent = Math.round(data.rpm);
    animateValue(elements.rpm);
  }
  
  if (elements.healthScore) {
    elements.healthScore.textContent = `${healthScore}%`;
    animateValue(elements.healthScore);
  }
}

function updateCharts() {
  // Atualizar gráfico de temperatura
  if (tempChart && tempHistory.length > 0) {
    updateTempChart(tempChart, tempHistory[tempHistory.length - 1]);
  }
  
  // Atualizar gráfico de vibração
  const vibrationCtx = document.getElementById('vibrationChart');
  if (vibrationCtx) {
    drawVibrationChart(vibrationCtx, vibrationHistory);
  }
  
  // Atualizar gráfico de energia
  const energyCtx = document.getElementById('energyChart');
  if (energyCtx) {
    drawEnergyChart(energyCtx, energyHistory);
  }
}

function updateSystemStatus(anomaly, healthScore) {
  let status = "NORMAL";
  let color = "#00ff9d";
  let statusText = "";
  
  if (anomaly) {
    status = "CRÍTICO";
    color = "#ff003c";
    statusText = "Anomalia detectada!";
  } else if (healthScore < 80) {
    status = "ATENÇÃO";
    color = "#ffcc00";
    statusText = "Monitorando...";
  } else {
    status = "NORMAL";
    color = "#00ff9d";
    statusText = "Tudo operacional";
  }
  
  if (elements.statusText) {
    elements.statusText.textContent = `${status} (${healthScore}%)`;
    elements.statusText.style.color = color;
  }
  
  if (elements.statusDot) {
    elements.statusDot.style.background = color;
    elements.statusDot.style.boxShadow = `0 0 15px ${color}`;
  }
}

function generateAlert(data, anomaly) {
  const alert = {
    id: Date.now(),
    message: anomaly ? "Anomalia detectada" : "Alerta do sistema",
    description: `Temp: ${data.temperature.toFixed(1)}°C, Vib: ${data.vibration.toFixed(3)}`,
    severity: 'high',
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
    acknowledged: false
  };
  
  // Adicionar alerta
  alerts.unshift(alert);
  if (alerts.length > 10) alerts.pop();
  
  updateAlertsDisplay();
  
  // Notificação visual
  showNotification(alert.message, 'error');
}

function updateAlertsDisplay() {
  if (!elements.alertList) return;
  
  // Limpar lista
  elements.alertList.innerHTML = '';
  
  if (alerts.length === 0) {
    elements.alertList.innerHTML = `
      <li class="no-alerts">
        <i class="fas fa-check-circle" style="color: #00ff9d"></i>
        Nenhum alerta no momento
      </li>
    `;
  } else {
    alerts.forEach(alert => {
      const li = document.createElement('li');
      li.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: ${alert.severity === 'high' ? '#ff003c' : '#ffcc00'}"></i>
        <div style="flex: 1;">
          <div style="font-weight: 600;">${alert.message}</div>
          <div style="font-size: 0.8em; color: #a0a0b0;">${alert.description}</div>
        </div>
        <span style="color: #a0a0b0; font-size: 0.8em">${alert.timestamp}</span>
      `;
      li.style.animation = 'highlight 0.5s ease';
      elements.alertList.appendChild(li);
    });
  }
  
  if (elements.alertCount) {
    elements.alertCount.textContent = alerts.length;
    if (alerts.length > 0) {
      elements.alertCount.style.animation = 'pulse 0.5s';
      setTimeout(() => {
        elements.alertCount.style.animation = '';
      }, 500);
    }
  }
}

function updatePredictive(data) {
  // Atualizar última verificação
  if (elements.lastScan) {
    const minutes = Math.floor(Math.random() * 10);
    elements.lastScan.textContent = `${minutes} min atrás`;
  }
  
  // Atualizar manutenção preditiva
  if (elements.nextMaintenance) {
    const hours = Math.max(1, Math.floor(48 - (data.vibration * 100)));
    elements.nextMaintenance.textContent = `${hours}h`;
    
    if (elements.maintenanceProgress) {
      const progress = Math.min(95, 100 - (hours / 48 * 100));
      elements.maintenanceProgress.style.width = `${progress}%`;
    }
  }
}

// Monitoramento de segurança
function startSecurityMonitoring() {
  setInterval(() => {
    // Verificar ameaças periodicamente
    const threat = simulateThreatDetection();
    if (Math.random() > 0.7) { // 30% chance de detectar ameaça
      addAlert({
        id: Date.now(),
        message: "Ameaça de segurança detectada",
        description: threat,
        severity: 'high',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
        acknowledged: false
      });
    }
  }, 10000); // A cada 10 segundos
}

// FUNÇÕES AUXILIARES
function animateValue(element) {
  if (!element) return;
  
  element.style.transform = 'scale(1.1)';
  element.style.transition = 'transform 0.2s ease';
  
  setTimeout(() => {
    element.style.transform = 'scale(1)';
  }, 200);
}

function showNotification(message, type = 'info') {
  // Não mostrar notificações de info no modo silencioso
  // Apenas mostrar notificações críticas (erro, aviso, sucesso)
  if (type === 'info') {
    return;
  }
  
  // Criar notificação
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'error' ? 'rgba(255, 0, 60, 0.9)' : 
                type === 'warning' ? 'rgba(255, 204, 0, 0.9)' : 
                'rgba(0, 255, 157, 0.9)'};
    color: white;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
    max-width: 300px;
    border-left: 4px solid ${type === 'error' ? '#ff003c' : 
                           type === 'warning' ? '#ffcc00' : 
                           '#00ff9d'};
    backdrop-filter: blur(10px);
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 
                    type === 'warning' ? 'exclamation-circle' : 
                    'check-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Remover após 5 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// ADICIONAR ESTILOS DINÂMICOS
const dynamicStyles = `
  @keyframes highlight {
    0% { background: rgba(255, 0, 60, 0.3); }
    100% { background: transparent; }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .shake {
    animation: shake 0.5s ease;
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);

// Garantir que os event listeners sejam adicionados mesmo se o DOMContentLoaded falhar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  // DOM já foi carregado
  initializeDashboard();
}

// Fallback: adicionar listeners manualmente se setupSidebarButtons falhar
window.addEventListener('load', () => {
  console.log('⏱️ Window load event disparado');
  if (!document.getElementById('sidebarToggle').hasListener) {
    setupSidebarButtons();
  }
});

export { initializeDashboard };