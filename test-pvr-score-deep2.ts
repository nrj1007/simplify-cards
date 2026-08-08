import { scoreCards } from './lib/recommend';
const scored = scoreCards({ query: "Which card best for movie tickets?" });
const pvrInox = scored.find(c => c.card.id === 'kotak-pvr-inox');
console.log(pvrInox ? "Score: " + pvrInox.fitScore + ", boost: " + pvrInox.debug.focusBoost + " disqual: " + pvrInox.fitScore : "DROPPED");
