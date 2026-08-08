import { cards } from './lib/cards';
import { RecommendationInput } from './lib/types';
import { parseQueryIntent } from './lib/query-intent';
import { cardMatchesCategoryFocus } from './lib/recommend-category-focus';
import { detectCategoryFocus } from './lib/recommend';

const input: RecommendationInput = { query: "Which card best for movie tickets?" };
const intent = parseQueryIntent(input.query!);
const categoryFocus = detectCategoryFocus(input, intent);
const card = cards.find(c => c.id === 'kotak-pvr-inox')!;
console.log("Matches Focus:", categoryFocus ? cardMatchesCategoryFocus(card, categoryFocus) : false);
