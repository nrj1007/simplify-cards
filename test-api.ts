import { answerQuestion } from './lib/ask-ai';

async function testQuery() {
  const response = await answerQuestion({
    query: "Which card best for movie tickets?",
    messages: []
  });

  console.log(response.cards?.slice(0, 5).map(c => c.card.name));
}

testQuery().catch(console.error);
