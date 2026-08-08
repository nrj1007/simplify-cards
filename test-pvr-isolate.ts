import { scoreCardForSpend, defaultSpendProfile } from './lib/recommend';
import { cards } from './lib/cards';
const card = cards.find(c => c.id === 'kotak-pvr-inox')!;
const score = scoreCardForSpend(card, defaultSpendProfile, 50000);
console.log("Value Score:", score.debug.valueScore);
console.log("Focus Boost:", score.debug.focusBoost);
console.log("Fit Score:", score.fitScore);
