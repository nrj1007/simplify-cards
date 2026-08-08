import { scoreCards } from './lib/recommend';
const results = scoreCards({ query: "Which card best for movie tickets?" });
const pvrCards = results.filter(c => c.card.id.includes("pvr"));
console.log(pvrCards.map(c => c.card.name + " Focus Boost: " + c.debug.focusBoost + " Total: " + c.fitScore));
