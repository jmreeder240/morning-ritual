const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TODOIST_TOKEN;

app.use(cors());
app.use(express.json());

// Proxy all Todoist API requests
app.all('/todoist/*', async (req, res) => {
  const path = req.path.replace('/todoist', '');
  const url = 'https://api.todoist.com/rest/v2' + path;
  
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
    
    if (status === 204) {
      res.status(204).send();
      return;
    }
    
    const data = await response.json();
    res.status(status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log('Proxy running on port ' + PORT));
