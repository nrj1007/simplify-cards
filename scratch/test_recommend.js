const { scoreCards } = require('../.tmp-recommend/lib/recommend.js');

const results = scoreCards({ query: 'best credit card under 5000' });
console.log('Total scored cards:', results.length);

const discontinued = results.filter(r => r.card.status === 'discontinued');
console.log('Scored discontinued cards:', discontinued.map(r => r.card.name));
