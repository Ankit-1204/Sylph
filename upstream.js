const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.all('/', (req, res) => {
    console.log('responding')
  res.json({
    message: 'Hello from origin!',
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  });
});

app.listen(PORT, () => console.log(`Origin server at http://localhost:${PORT}`));
