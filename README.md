# Sylph

Sylph is a lightweight, modular reverse proxy server built using Node.js. It is designed to be extensible, with support for routing, caching, and middleware — all configurable for different use cases like load balancing or request inspection.

This project is primarily aimed at developers looking to integrate a custom proxy into their server-side infrastructure or development workflows.

---

## Features

- 🛣️ **Routing** – Define and manage custom routes using a Trie-based router.
- 💾 **Caching** – In-memory caching to reduce duplicate network requests.
- 🧩 **Middleware Support** – Add request/response middlewares for inspection, logging, etc.
- ⚖️ **Load Balancing (optional)** – Configurable support for balancing across multiple targets.
- 🔧 **Simple Setup** – Small footprint and minimal configuration needed.

---

## Use Cases

- Proxy API requests during frontend development
- Add caching or auth to upstream services
- Debug and inspect HTTP traffic
- Load balance across multiple internal services

---

## Getting Started

To use Sylph in your project:

```bash
npm install @ankit-1204/sylph
```
```js
const { proxy } = require('@ankit-1204/sylph');

const app = proxy({ port: 8080 });

app.addRoute('/api', 'GET', () => 'http://localhost:3001');

app.start();
```