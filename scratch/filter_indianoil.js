const fs = require('fs');
const path = require('path');

const matches = JSON.parse(fs.readFileSync(path.join(__dirname, 'indianoil_matches.txt'), 'utf8'));

const searchTerms = [
  '5%',
  'fuel points',
  'fuelpoint',
  'surcharge',
  'grocery',
  'utilities',
  'cap',
  'renewal fee',
  'joining fee',
  'age',
  'income',
  'itr',
  'exclusion',
  'exclude'
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

fs.writeFileSync(path.join(__dirname, 'filter_results.txt'), output);
console.log('Saved filter results to filter_results.txt');
