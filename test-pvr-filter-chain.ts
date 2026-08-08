import { cards } from './lib/cards';
import { RecommendationInput } from './lib/types';
import { parseQueryIntent } from './lib/query-intent';
import { shouldHideCardFromGenericRanking } from './lib/recommend-scoring';
import { cardMatchesCategoryFocus } from './lib/recommend-category-focus';
import { netCategoryReward, detectCategoryFocus, categoryFocusMonthlySpend, defaultSpendProfile } from './lib/recommend';

const input: RecommendationInput = { query: "Which card best for movie tickets?" };
const intent = parseQueryIntent(input.query!);
const categoryFocus = detectCategoryFocus(input, intent);
const focusedCategory = categoryFocus?.spendCategory as string;

const card = cards.find(c => c.id === 'kotak-pvr-inox')!;

console.log("1:", !shouldHideCardFromGenericRanking(card, input, intent));
console.log("2:", categoryFocus ? cardMatchesCategoryFocus(card, categoryFocus) : true);
console.log("3:", focusedCategory ? (card.bestFor?.includes(focusedCategory) || netCategoryReward(card, focusedCategory, categoryFocusMonthlySpend[focusedCategory] ?? 8000, false) > 0) : true);

