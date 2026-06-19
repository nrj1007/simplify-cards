import { answerQuestion } from "../lib/ask-ai";
import { getCardById, cards } from "../lib/card-index";

async function main() {
  console.log("Total indexed cards:", cards.length);
  const taj = getCardById("hsbc-taj");
  const visaPlat = getCardById("hsbc-visa-platinum");
  console.log("HSBC Taj in index:", !!taj);
  console.log("HSBC Visa Platinum in index:", !!visaPlat);

  const resTaj = await answerQuestion({ query: "HSBC taj" });
  console.log("\n--- query: HSBC taj ---");
  console.log("Summary:", resTaj.summary);
  console.log("Cards resolved:", resTaj.cards.map(c => c.card.id));

  const resVisa = await answerQuestion({ query: "visa platinum" });
  console.log("\n--- query: visa platinum ---");
  console.log("Summary:", resVisa.summary);
  console.log("Cards resolved:", resVisa.cards.map(c => c.card.id));
}

main().catch(console.error);
