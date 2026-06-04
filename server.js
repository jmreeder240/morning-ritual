const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 8080;
const TOKEN = process.env.TODOIST_TOKEN;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());
app.use(express.json());

app.all('/todoist/*', async (req, res) => {
  const path = req.path.replace('/todoist', '');
  const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const url = 'https://api.todoist.com/rest/v2' + path + qs;

  try {
    const options = {
      method: req.method,
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json'
      }
    };

    if (req.method !== 'GET' && req.method !== 'DELETE') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    const status = response.status;

    if (status === 204) { res.status(204).send(); return; }

    const data = await response.json();
    res.status(status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log('Proxy running on port ' + PORT));
