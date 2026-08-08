import { scoreCards } from './lib/recommend';
const results = scoreCards({ query: "Which card best for movie tickets?" });
console.log("Total returned:", results.length);
