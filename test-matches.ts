import { cards } from './lib/cards';
import { cardMatchesCategoryFocus, categoryFocusConfigs } from './lib/recommend-category-focus';
const pvrCards = cards.filter(c => c.id.includes("pvr"));
const entertainmentFocus = categoryFocusConfigs.find(c => c.key === "entertainment");
for (const card of pvrCards) {
  console.log(card.name, "Matches?", cardMatchesCategoryFocus(card, entertainmentFocus!));
}
