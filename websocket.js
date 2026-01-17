export class RealWebSocket {
  constructor(onMessage) {
    this.ws = new WebSocket("ws://localhost:8000/ws/telemetry");

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage({
        type: "telemetry",
        payload: data
      });
    };
  }
}

export class FakeWebSocket {
  constructor(onMessage, token) {
    this.onMessage = onMessage;
    this.token = token;
    this.connected = false;
    this.interval = null;
    this.start();
  }

  start() {
    // Simulação de Handshake de Segurança
    console.log(`[WS] Iniciando conexão segura com token: ${this.token ? '***' : 'NULO'}`);
    
    // Simular delay de conexão
    setTimeout(() => {
      this.connected = true;
      console.log('[WS] Conexão estabelecida com sucesso!');
      
      // Enviar dados simulados periodicamente
      this.interval = setInterval(() => {
        if (!this.connected) return;

        const baseTemp = 65 + Math.random() * 20;
        const anomaly = Math.random() > 0.85; // 15% chance de anomalia
        
        const message = {
          type: "telemetry",
          payload: {
            temperature: anomaly ? baseTemp + 15 : baseTemp,
            vibration: Math.random() * (anomaly ? 0.08 : 0.05),
            rpm: Math.floor(1400 + Math.random() * 200),
            pressure: 1.0 + Math.random() * 0.4,
            powerConsumption: 45 + Math.random() * 15,
            timestamp: new Date().toISOString(),
            deviceId: 'sensor-' + Math.floor(Math.random() * 12)
          }
        };

        this.onMessage(message);
      }, 2000); // A cada 2 segundos
    }, 1000);
  }

  stop() {
    this.connected = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    console.log('[WS] Conexão encerrada');
  }
}