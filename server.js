const https = require('https');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 8080;
const TOKEN = process.env.TODOIST_TOKEN;

const server = http.createServer((req, res) => {
  // CORS headers on every response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: 'ok', token: TOKEN ? 'set' : 'missing'}));
    return;
  }

  // Proxy Todoist requests
  if (req.url.startsWith('/todoist/')) {
    const todoistPath = req.url.replace('/todoist', '');
    const parsedUrl = url.parse('https://api.todoist.com/rest/v2' + todoistPath);

    const options = {
      hostname: 'api.todoist.com',
      path: '/api/v1' + todoistPath,
      method: req.method,
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json'
      }
    };

    console.log('Proxying:', req.method, options.path);
    console.log('Token starts with:', TOKEN ? TOKEN.substring(0, 8) : 'MISSING');

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => { data += chunk; });
        proxyRes.on('end', () => {
          console.log('Todoist response status:', proxyRes.statusCode);
          console.log('Todoist response:', data.substring(0, 200));
          
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          if (proxyRes.statusCode === 204) {
            res.writeHead(204);
            res.end();
            return;
          }

          try {
            const json = JSON.parse(data);
            res.writeHead(proxyRes.statusCode, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(json));
          } catch(e) {
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'Parse error', raw: data.substring(0, 500)}));
          }
        });
      });

      proxyReq.on('error', (e) => {
        console.error('Proxy error:', e);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: e.message}));
      });

      if (body && req.method !== 'GET' && req.method !== 'DELETE') {
        proxyReq.write(body);
      }
      proxyReq.end();
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => console.log('Server running on port ' + PORT));
