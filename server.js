const https = require('https');
const http = require('http');

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

    var body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      console.log('Proxying:', req.method, options.path);
      if (body) console.log('Request body:', body.substring(0, 200));

      var proxyReq = https.request(options, function(proxyRes) {
        var data = '';
        proxyRes.on('data', function(chunk) { data += chunk; });
        proxyRes.on('end', function() {
          console.log('Status:', proxyRes.statusCode, '| Response:', data.substring(0, 300));
          res.setHeader('Access-Control-Allow-Origin', '*');
          if (proxyRes.statusCode === 204) { res.writeHead(204); res.end(); return; }
          try {
            var json = JSON.parse(data);
            res.writeHead(proxyRes.statusCode, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(json));
          } catch(e) {
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'Parse error', raw: data.substring(0, 300)}));
          }
        });
      });

      proxyReq.on('error', function(e) {
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
