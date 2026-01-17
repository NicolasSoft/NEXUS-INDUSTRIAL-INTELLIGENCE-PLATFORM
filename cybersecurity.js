export function simulateThreatDetection() {
  const threats = [
    "Unauthorized access attempt",
    "Data exfiltration detected",
    "Port scanning activity",
    "Malware signature detected",
    "DDoS attack mitigated"
  ];
  
  return threats[Math.floor(Math.random() * threats.length)];
}

export function encryptData(data, key) {
  // Simulação de criptografia AES-256
  const encoder = new TextEncoder();
  const encoded = encoder.encode(JSON.stringify(data));
  return btoa(String.fromCharCode(...encoded));
}

export function firewallCheck(ip) {
  const blockedIPs = ['192.168.1.100', '10.0.0.5'];
  return !blockedIPs.includes(ip);
}