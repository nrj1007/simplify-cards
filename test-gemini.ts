import { parseQueryIntent } from './lib/query-intent';
import { callAiWithSchemaDetailed } from './lib/ai-provider';
import { answerQuestion } from './lib/ask-ai';

async function test() {
  const result = await answerQuestion({ query: "Which card best for movie tickets?", messages: [] });
  console.log("Intent:", result.meta?.intentLabel);
  console.log("AI Used:", result.meta?.ai?.aiUsed);
  console.log("Top 3 Cards:", result.cards?.slice(0,3).map(c => c.card.name));
}

test().catch(console.error);
