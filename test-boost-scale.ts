import { scoreCards } from './lib/recommend';

const testBoost = (boostVal: number) => {
    let fs = require('fs');
    let content = fs.readFileSync('lib/recommend.ts', 'utf8');
    content = content.replace(/focusBoost \+= \d+; \/\/ brand co-brand boost/g, `focusBoost += ${boostVal}; // brand co-brand boost`);
    // wait I'll just temporarily mock the logic directly without changing the file. No, the file was already changed.
};
