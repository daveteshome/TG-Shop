// proxy.js (resilient)
const httpProxy = require('http-proxy');
const http = require('http');
const url = require('url');

const BACKEND = 'http://127.0.0.1:4000';
const FRONTEND = 'http://127.0.0.1:5173';

const proxy = httpProxy.createProxyServer({
  target: FRONTEND,
  changeOrigin: true,
  proxyTimeout: 15000,
  timeout: 15000,
});

function send502(res, msg) {
  try {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'bad_gateway', detail: msg }));
  } catch {}
}

// Don’t let ECONNREFUSED crash the process
proxy.on('error', (err, req, res) => {
  console.error('[proxy error]', err.code || err.message, 'on', req.method, req.url);
  send502(res, String(err.code || err.message));
});

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname || '/';

  // Rewrite /backend/tg/webhook -> /tg/webhook
  if (pathname === '/backend/tg/webhook') {
    req.url = req.url.replace(/^\/backend\/tg\/webhook/, '/tg/webhook');
    return proxy.web(req, res, { target: BACKEND });
  }

  // Rewrite /backend/* -> /api/*
  if (pathname.startsWith('/backend')) {
    req.url = req.url.replace(/^\/backend/, '/api');
    return proxy.web(req, res, { target: BACKEND });
  }

  // Everything else -> Vite frontend
  return proxy.web(req, res, { target: FRONTEND });
});

server.listen(8080, () => {
  console.log('Reverse proxy listening on http://127.0.0.1:8080');
});
