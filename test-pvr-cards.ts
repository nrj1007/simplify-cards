import { cards } from './lib/cards';
const pvr = cards.filter(c => c.id.includes("pvr"));
console.log(pvr.map(c => c.name));
