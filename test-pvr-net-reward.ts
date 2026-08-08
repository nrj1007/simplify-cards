import { cards } from './lib/cards';
import { netCategoryReward } from './lib/recommend';
const card = cards.find(c => c.id === 'kotak-pvr-inox')!;
console.log(netCategoryReward(card, "entertainment", 8000, false));
