export function drawNetworkTopology(canvas) {
  const ctx = canvas.getContext('2d');
  const nodes = [
    { x: 100, y: 100, type: 'hub', label: 'Main Hub' },
    { x: 200, y: 50, type: 'sensor', label: 'Temp Sensor' },
    { x: 200, y: 150, type: 'sensor', label: 'Vib Sensor' },
    { x: 300, y: 100, type: 'gateway', label: 'Azure Gateway' }
  ];
  
  // Desenhar conexões
  ctx.strokeStyle = '#4da3ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  
  nodes.forEach((node, i) => {
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();
    }
  });
  
  // Desenhar nós
  nodes.forEach(node => {
    ctx.fillStyle = node.type === 'hub' ? '#005691' : 
                    node.type === 'gateway' ? '#008ECF' : '#4caf50';
    ctx.beginPath();
    ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Roboto';
    ctx.fillText(node.label, node.x - 20, node.y + 25);
  });
}