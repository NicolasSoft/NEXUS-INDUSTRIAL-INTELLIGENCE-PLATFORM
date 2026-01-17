export function detectAnomaly(data) {
  const anomalies = [];
  
  // Verificar temperatura
  if (data.temperature > 80) {
    anomalies.push(`Temperatura crítica: ${data.temperature.toFixed(1)}°C`);
  } else if (data.temperature > 75) {
    anomalies.push(`Temperatura alta: ${data.temperature.toFixed(1)}°C`);
  }
  
  // Verificar vibração
  if (data.vibration > 0.06) {
    anomalies.push(`Vibração excessiva: ${data.vibration.toFixed(3)}`);
  } else if (data.vibration > 0.04) {
    anomalies.push(`Vibração alta: ${data.vibration.toFixed(3)}`);
  }
  
  // Verificar RPM
  if (data.rpm > 1700 || data.rpm < 1300) {
    anomalies.push(`RPM fora do padrão: ${data.rpm}`);
  }
  
  return anomalies.length > 0 ? anomalies : null;
}

export function calculateHealthScore(data) {
  let score = 100;
  
  // Penalizar temperatura (ideal: 65-75°C)
  if (data.temperature < 65 || data.temperature > 75) {
    const deviation = Math.abs(data.temperature - 70);
    score -= deviation * 2;
  }
  
  // Penalizar vibração (ideal: <0.03)
  if (data.vibration > 0.03) {
    score -= (data.vibration - 0.03) * 800;
  }
  
  // Penalizar RPM fora do ideal (1450-1550)
  if (data.rpm < 1450 || data.rpm > 1550) {
    const deviation = Math.abs(data.rpm - 1500);
    score -= deviation * 0.04;
  }
  
  // Penalizar pressão (ideal: 1.0-1.3)
  if (data.pressure) {
    if (data.pressure < 1.0 || data.pressure > 1.3) {
      const deviation = Math.abs(data.pressure - 1.15);
      score -= deviation * 20;
    }
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}