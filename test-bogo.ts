import { scoreCards } from './lib/recommend';
const results = scoreCards({ query: "Which card best for movie tickets?" });
console.log(results.slice(0, 5).map(c => c.card.name));
