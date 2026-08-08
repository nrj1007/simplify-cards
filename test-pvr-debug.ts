import { cards } from './lib/cards';
import { RecommendationInput } from './lib/types';
import { scoreCards } from './lib/recommend';
const results = scoreCards({ query: "Which card best for movie tickets?" });
console.log(results.slice(0,10).map(c => c.card.name));
