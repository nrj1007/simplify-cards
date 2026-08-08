fetch('https://www.simplifycards.in/api/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  },
  body: JSON.stringify({ query: 'Which card best for movie tickets?' })
})
.then(res => res.json())
.then(data => {
  console.log("Prod Top 5:", data.cards.slice(0, 5).map(c => c.card.name));
})
.catch(console.error);
