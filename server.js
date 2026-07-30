const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SHEET_ID = '1c_EEcwJwEqLylIYywvWCOmR9CUDqF0jH-h35pTEcNp8';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

function fetchCSV(res) {
  https.get(CSV_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (gsRes) => {
    // Google Sheets may redirect
    if (gsRes.statusCode >= 300 && gsRes.statusCode < 400 && gsRes.headers.location) {
      https.get(gsRes.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (redirRes) => {
        if (redirRes.statusCode !== 200) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Redirect returned HTTP ${redirRes.statusCode}` }));
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        });
        redirRes.pipe(res);
      }).on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Redirect error: ' + err.message }));
      });
      return;
    }

    if (gsRes.statusCode !== 200) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Google Sheets returned HTTP ${gsRes.statusCode}` }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    gsRes.pipe(res);
  }).on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/csv') {
    fetchCSV(res);
    return;
  }

  let filePath = path.join(__dirname, url.pathname === '/' ? 'dashboard-estadisticas.html' : url.pathname);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>404 — No encontrado: ${url.pathname}</h1>`);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`📊 Dashboard en: http://localhost:${PORT}`);
});
