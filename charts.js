export function createTempChart(ctx) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({length: 20}, (_, i) => i + 1),
      datasets: [{
        label: "Temperatura (°C)",
        data: Array(20).fill(0),
        borderColor: "#00f2ff",
        backgroundColor: "rgba(0, 242, 255, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: "#00f2ff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          display: false,
          grid: { display: false }
        },
        y: {
          min: 60,
          max: 90,
          grid: { 
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: { 
            color: '#a0a0b0',
            callback: value => value + '°C'
          }
        }
      }
    }
  });
}

export function updateTempChart(chart, value) {
  chart.data.datasets[0].data.push(value);
  
  if (chart.data.datasets[0].data.length > 20) {
    chart.data.datasets[0].data.shift();
  }
  
  chart.update('none');
}