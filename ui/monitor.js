const logEl = document.getElementById('log');
const WS_PATH = '/custom-ws';
const socket = new WebSocket(`ws://${location.host}${WS_PATH}`);

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const line = `[${data.time}] ${data.method} ${data.url} → ${data.target} (${data.status})\n`;
  logEl.textContent += line;
  logEl.scrollTop = logEl.scrollHeight;
};

async function fetchData() {
  const data = await fetch('/__proxy/status').then(r => r.json());
  document.getElementById('routes').textContent = JSON.stringify(data.routes, null, 2);
  document.getElementById('cacheStats').textContent = JSON.stringify(data.cache, null, 2);
  document.getElementById('loadBalancerStats').textContent = JSON.stringify(data.loadBalancer, null, 2);
}

fetchData();
setInterval(fetchData, 3000);