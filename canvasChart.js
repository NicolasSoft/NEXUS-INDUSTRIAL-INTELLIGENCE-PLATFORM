export function drawVibrationChart(canvas, data) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  
  // Limpar canvas
  ctx.clearRect(0, 0, width, height);
  
  // Desenhar grade
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  
  // Linhas horizontais
  for (let i = 1; i <= 4; i++) {
    const y = (height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Desenhar linha de vibração
  ctx.strokeStyle = "#ff9f43";
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  const step = width / (data.length - 1);
  const maxVibration = Math.max(...data.filter(v => !isNaN(v))) || 0.1;
  const scale = height * 0.8 / maxVibration;
  
  data.forEach((value, index) => {
    const x = index * step;
    const y = height - (value * scale) - (height * 0.1);
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Preenchimento
  ctx.fillStyle = "rgba(255, 159, 67, 0.2)";
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  
  // Labels
  ctx.fillStyle = "#a0a0b0";
  ctx.font = "12px 'Segoe UI'";
  ctx.fillText("Vibração", 10, 15);
  ctx.fillText(`${maxVibration.toFixed(3)}`, width - 40, 15);
}

export function drawEnergyChart(canvas, data) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  
  // Limpar canvas
  ctx.clearRect(0, 0, width, height);
  
  // Desenhar grade
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  
  // Linhas horizontais
  for (let i = 1; i <= 4; i++) {
    const y = (height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Desenhar linha de energia com cores
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  const step = width / (data.length - 1);
  const maxEnergy = Math.max(...data.filter(v => !isNaN(v))) || 100;
  const scale = height * 0.8 / maxEnergy;
  
  data.forEach((value, index) => {
    const x = index * step;
    const y = height - (value * scale) - (height * 0.1);
    
    // Cor baseada no valor
    if (value > maxEnergy * 0.8) {
      ctx.strokeStyle = "#ff003c"; // Vermelho - alto consumo
    } else if (value > maxEnergy * 0.5) {
      ctx.strokeStyle = "#ffcc00"; // Amarelo - médio
    } else {
      ctx.strokeStyle = "#00ff9d"; // Verde - baixo
    }
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Preenchimento com gradiente
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(0, 255, 157, 0.3)");
  gradient.addColorStop(1, "rgba(0, 255, 157, 0.05)");
  
  ctx.fillStyle = gradient;
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  
  // Labels
  ctx.fillStyle = "#a0a0b0";
  ctx.font = "12px 'Segoe UI'";
  ctx.fillText("Energia (kW)", 10, 15);
  ctx.fillText(`${maxEnergy.toFixed(1)}`, width - 50, 15);
}

export function drawNetworkChart(canvas) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  
  // Limpar canvas
  ctx.clearRect(0, 0, width, height);
  
  // Fundo com gradiente
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "rgba(0, 242, 255, 0.05)");
  bgGradient.addColorStop(1, "rgba(112, 0, 255, 0.05)");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  
  // Definir nós da rede
  const nodes = [
    { x: width / 2, y: height / 2, radius: 15, label: "Server", color: "#00f2ff" },
    { x: width / 4, y: height / 3, radius: 12, label: "Sensor 1", color: "#00ff9d" },
    { x: (3 * width) / 4, y: height / 3, radius: 12, label: "Sensor 2", color: "#00ff9d" },
    { x: width / 4, y: (2 * height) / 3, radius: 12, label: "Sensor 3", color: "#ffcc00" },
    { x: (3 * width) / 4, y: (2 * height) / 3, radius: 12, label: "Sensor 4", color: "#ff003c" },
    { x: width / 2, y: height * 0.15, radius: 10, label: "Cloud", color: "#7000ff" },
    { x: width / 2, y: height * 0.85, radius: 10, label: "Database", color: "#00f2ff" }
  ];
  
  // Desenhar conexões com glow
  ctx.strokeStyle = "rgba(0, 242, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(0, 242, 255, 0.5)";
  
  const mainNode = nodes[0];
  nodes.forEach((node, index) => {
    if (index !== 0) {
      ctx.beginPath();
      ctx.moveTo(mainNode.x, mainNode.y);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();
      
      // Animação: linha pulsante a partir do servidor
      const progress = (Date.now() % 2000) / 2000;
      const x = mainNode.x + (node.x - mainNode.x) * progress;
      const y = mainNode.y + (node.y - mainNode.y) * progress;
      
      ctx.fillStyle = "rgba(0, 242, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  ctx.shadowBlur = 0;
  
  // Desenhar nós
  nodes.forEach((node) => {
    // Glow externo
    ctx.fillStyle = node.color + "33";
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Borda
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Preenchimento
    const nodeGradient = ctx.createRadialGradient(node.x - 5, node.y - 5, 0, node.x, node.y, node.radius);
    nodeGradient.addColorStop(0, node.color + "88");
    nodeGradient.addColorStop(1, node.color + "44");
    ctx.fillStyle = nodeGradient;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Label
    ctx.fillStyle = "#e0e0e0";
    ctx.font = "11px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(node.label, node.x, node.y + node.radius + 20);
  });
  
  // Título
  ctx.fillStyle = "#a0a0b0";
  ctx.font = "12px 'Segoe UI'";
  ctx.textAlign = "left";
  ctx.fillText("Topologia em Tempo Real", 10, 15);
  
  // Status
  const onlineCount = nodes.length - 1;
  ctx.fillStyle = "#00ff9d";
  ctx.fillText(`${onlineCount}/${nodes.length - 1} Dispositivos Online`, width - 180, 15);
  
  // Redesenhar constantemente para animação
  requestAnimationFrame(() => drawNetworkChart(canvas));
}