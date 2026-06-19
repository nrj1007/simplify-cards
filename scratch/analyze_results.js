const fs = require('node:fs');
const path = require('node:path');

const resultsFile = path.join(__dirname, 'url_check_results.json');
if (!fs.existsSync(resultsFile)) {
  console.error(`url_check_results.json not found.`);
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

const candidates = [];

for (const entry of results) {
  const issues = [];
  
  const checkSource = entry.sourceUrlCheck;
  const checkApply = entry.applyUrlCheck;
  
  if (checkSource) {
    if (!checkSource.ok) {
      issues.push(`Source URL failed: status ${checkSource.status || 'unknown'} (${checkSource.reason || 'none'})`);
    } else if (checkSource.matchedKeywords && checkSource.matchedKeywords.length > 0) {
      issues.push(`Source URL keyword match: ${checkSource.matchedKeywords.join(', ')}`);
    }
  }
  
  if (checkApply) {
    if (!checkApply.ok) {
      issues.push(`Apply URL failed: status ${checkApply.status || 'unknown'} (${checkApply.reason || 'none'})`);
    } else if (checkApply.matchedKeywords && checkApply.matchedKeywords.length > 0) {
      issues.push(`Apply URL keyword match: ${checkApply.matchedKeywords.join(', ')}`);
    }
  }
  
  if (issues.length > 0) {
    candidates.push({
      id: entry.cardId,
      name: entry.name,
      issuer: entry.issuer,
      currentStatus: entry.currentStatus,
      filePath: entry.filePath,
      issues
    });
  }
}

console.log(`Found ${candidates.length} potential discontinued cards:`);
console.log(JSON.stringify(candidates, null, 2));
fs.writeFileSync(path.join(__dirname, 'candidates.json'), JSON.stringify(candidates, null, 2), 'utf8');
