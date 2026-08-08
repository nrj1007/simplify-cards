import { scoreCards } from './lib/recommend';
import fs from 'fs';
let content = fs.readFileSync('lib/recommend.ts', 'utf8');
content = content.replace('const candidateNetValues = candidateCards.map((card) => {', 'console.log("Candidate PVR cards:", candidateCards.filter(c => c.id.includes("pvr")).map(c => c.id)); const candidateNetValues = candidateCards.map((card) => {');
fs.writeFileSync('lib/recommend.ts', content);
