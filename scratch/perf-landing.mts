import { performance } from "node:perf_hooks";
import { landingsForCard } from "../lib/seo-landing";
import { cards } from "../lib/cards";
landingsForCard(cards[0].id); // warm
const t0 = performance.now();
for (const c of cards) landingsForCard(c.id);
const t1 = performance.now();
console.log(`cards: ${cards.length}`);
console.log(`total for all cards: ${(t1 - t0).toFixed(0)} ms`);
console.log(`per card: ${((t1 - t0) / cards.length).toFixed(1)} ms`);
