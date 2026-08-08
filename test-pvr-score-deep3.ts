import { scoreCards } from './lib/recommend';
import fs from 'fs';
let content = fs.readFileSync('lib/recommend.ts', 'utf8');
content = content.replace(/\.filter\(\(score\) => \(useEnvelopeScoring \? \(score\.envelopeScoring\?\.normalizedFitScore \?\? 0\) : score\.fitScore\) > 0\)/g, '');
fs.writeFileSync('lib/recommend.ts', content);
