import { scoreCards } from './lib/recommend';
const scored = scoreCards({ query: "Which card best for movie tickets?" });
const inox = scored.find(c => c.card.id === 'kotak-pvr-inox');
if (inox) {
  console.log("PVR INOX Score Details:");
  console.log("valueScore:", inox.debug.valueScore);
  console.log("focusBoost:", inox.debug.focusBoost);
  console.log("fitScore:", inox.fitScore);
} else {
  console.log("PVR INOX was NOT returned by scoreCards (filtered out or fitScore <= 0)");
}
