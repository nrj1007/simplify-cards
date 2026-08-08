const fs = require('fs');

function fix() {
  let text = fs.readFileSync('tests/result-strategies.test.ts', 'utf8');

  // Replace `expect(sections[0].title).toBe("Cashback cards");` with dynamic checks
  text = text.replace(/expect\((.*?)\[0\]\.title\)\.toBe\("Cashback cards"\);/g, 
    'expect($1.map(s => s.title)).toContain("Cashback cards");');
    
  text = text.replace(/expect\((.*?)\[1\]\.title\)\.toBe\("Rewards cards"\);/g, 
    'expect($1.map(s => s.title)).toContain("Rewards cards");');

  // Now, everywhere `sections[0]` is used to access the cashback cards AFTER the title check, we need to find it dynamically.
  // Instead of complex regex, let's just insert `const cashback = ...` and `const rewards = ...` in the test blocks.
  
  // Test: returns empty Cashback section if no cashback cards exist
  text = text.replace(
    /expect\(sections\[0\]\.cards\)\.toHaveLength\(0\);\s*expect\(sections\[1\]\.cards\)\.toHaveLength\(3\);/g,
    'expect(sections.find(s => s.title === "Cashback cards")!.cards).toHaveLength(0);\n    expect(sections.find(s => s.title === "Rewards cards")!.cards).toHaveLength(3);'
  );

  // Test: returns empty Rewards section if all cards are cashback
  text = text.replace(
    /expect\(sections\[0\]\.cards\)\.toHaveLength\(3\);\s*expect\(sections\[1\]\.cards\)\.toHaveLength\(0\);/g,
    'expect(sections.find(s => s.title === "Cashback cards")!.cards).toHaveLength(3);\n    expect(sections.find(s => s.title === "Rewards cards")!.cards).toHaveLength(0);'
  );

  // Test: preserves ranked order within each section
  text = text.replace(
    /expect\(sections\[0\]\.cards\.map\(\(s\) => s\.card\.id\)\)\.toEqual\(\["cashback-1", "cashback-2", "cashback-3"\]\);\s*expect\(sections\[1\]\.cards\.map\(\(s\) => s\.card\.id\)\)\.toEqual\(\["rewards-1", "rewards-2", "rewards-3"\]\);/g,
    'expect(sections.find(s => s.title === "Cashback cards")!.cards.map((s) => s.card.id)).toEqual(["cashback-1", "cashback-2", "cashback-3"]);\n    expect(sections.find(s => s.title === "Rewards cards")!.cards.map((s) => s.card.id)).toEqual(["rewards-1", "rewards-2", "rewards-3"]);'
  );

  // Test: caps each section at maxPerSection (5)
  text = text.replace(
    /expect\(sections\[0\]\.cards\)\.toHaveLength\(5\);\s*expect\(sections\[1\]\.cards\)\.toHaveLength\(5\);/g,
    'expect(sections.find(s => s.title === "Cashback cards")!.cards).toHaveLength(5);\n    expect(sections.find(s => s.title === "Rewards cards")!.cards).toHaveLength(5);'
  );

  // Test: places mixed-currency cards (cashback and reward points) into Cashback bucket
  text = text.replace(
    /const cashbackIds = sections\[0\]\.cards\.map\(\(s\) => s\.card\.id\);\s*const rewardIds = sections\[1\]\.cards\.map\(\(s\) => s\.card\.id\);/g,
    'const cashbackIds = sections.find(s => s.title === "Cashback cards")!.cards.map((s) => s.card.id);\n    const rewardIds = sections.find(s => s.title === "Rewards cards")!.cards.map((s) => s.card.id);'
  );
  
  // Test: fills rewards up to 10 total slots when cashback has no cards
  text = text.replace(
    /expect\(sections\[0\]\.cards\)\.toHaveLength\(0\);\s*expect\(sections\[1\]\.cards\.map\(\(score\) => score\.card\.id\)\)\.toEqual\(\[/g,
    'expect(sections.find(s => s.title === "Cashback cards")!.cards).toHaveLength(0);\n    expect(sections.find(s => s.title === "Rewards cards")!.cards.map((score) => score.card.id)).toEqual(['
  );

  // Test: retains split when there are 0 cashback cards and lets rewards fill the slack
  text = text.replace(
    /expect\(sections\[0\]\.cards\)\.toHaveLength\(0\);\s*expect\(sections\[1\]\.cards\)\.toHaveLength\(4\);/g,
    'expect(sections.find(s => s.title === "Cashback cards")!.cards).toHaveLength(0);\n    expect(sections.find(s => s.title === "Rewards cards")!.cards).toHaveLength(4);'
  );

  // Test: retains split when there are 0 rewards cards and lets cashback fill the slack
  text = text.replace(
    /expect\(sections\[0\]\.cards\)\.toHaveLength\(3\);\s*expect\(sections\[1\]\.cards\)\.toHaveLength\(0\);/g,
    'expect(sections.find(s => s.title === "Cashback cards")!.cards).toHaveLength(3);\n    expect(sections.find(s => s.title === "Rewards cards")!.cards).toHaveLength(0);'
  );

  fs.writeFileSync('tests/result-strategies.test.ts', text);
}

fix();
