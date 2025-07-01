const logEl = document.getElementById('log');
const WS_PATH = '/custom-ws';
const socket = new WebSocket(`ws://${location.host}${WS_PATH}`);

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const line = `[${data.time}] ${data.method} ${data.url} → ${data.target} (${data.status})\n`;
  logEl.textContent += line;
  logEl.scrollTop = logEl.scrollHeight;
};
