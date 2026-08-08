const https = require('https');

const data = JSON.stringify({
  query: 'Which card best for movie tickets?'
});

const options = {
  hostname: 'www.simplifycards.in',
  port: 443,
  path: '/api/ask',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      if (parsed.cards) {
        console.log("Top 10 cards:");
        parsed.cards.slice(0,10).forEach((c, i) => console.log(`${i+1}. ${c.card.name}`));
      } else {
        console.log("No cards found", body);
      }
    } catch(e) {
      console.log("Failed to parse response", body);
    }
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
