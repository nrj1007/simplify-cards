const fs = require('fs');
const path = require('path');

const matches = JSON.parse(fs.readFileSync(path.join(__dirname, 'moneyback_matches.txt'), 'utf8'));

const searchTerms = [
  '10x',
  '5x',
  'cashpoint',
  'cap',
  'limit',
  'fee',
  'surcharge',
  'exclusion',
  'exclude',
  'age',
  'income',
  'itr',
  'eligibility',
  'lounge'
];

let output = '';
searchTerms.forEach(term => {
  output += `\n=== SEARCH TERM: ${term.toUpperCase()} ===\n`;
  const found = matches.filter(m => m.text.toLowerCase().includes(term));
  const unique = Array.from(new Set(found.map(f => `${f.lineNum}: ${f.text}`)));
  unique.forEach(t => {
    output += `${t}\n`;
  });
});

fs.writeFileSync(path.join(__dirname, 'moneyback_results.txt'), output);
console.log('Saved filter results to moneyback_results.txt');
