const https = require('https');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 8080;
const TOKEN = process.env.TODOIST_TOKEN;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: 'ok', token: TOKEN ? 'set' : 'missing'}));
    return;
  }

  if (req.url.startsWith('/todoist/')) {
    var todoistPath = req.url.replace('/todoist', '');
    var options = {
      hostname: 'api.todoist.com',
      path: '/api/v1' + todoistPath,
      method: req.method,
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json'
      }
    };

    console.log('Proxying:', req.method, options.path);

    var body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      var proxyReq = https.request(options, function(proxyRes) {
        var data = '';
        proxyRes.on('data', function(chunk) { data += chunk; });
        proxyRes.on('end', function() {
          console.log('Status:', proxyRes.statusCode, '| Length:', data.length);
          res.setHeader('Access-Control-Allow-Origin', '*');
          if (proxyRes.statusCode === 204) { res.writeHead(204); res.end(); return; }
          try {
            var json = JSON.parse(data);
            res.writeHead(proxyRes.statusCode, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(json));
          } catch(e) {
            console.log('Parse error, raw:', data.substring(0, 200));
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'Parse error', raw: data.substring(0, 300)}));
          }
        });
      });

      proxyReq.on('error', function(e) {
        console.error('Proxy error:', e.message);
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

server.listen(PORT, function() { console.log('Server running on port ' + PORT); });
