import { scoreCards } from './lib/recommend';
import { cards } from './lib/cards';
const card = cards.find(c => c.id === 'kotak-pvr-inox')!;
const scored = scoreCards({ query: "Which card best for movie tickets?", cards: [card] });
console.log(scored.length > 0 ? scored[0] : "DROPPED");
