const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\manpr\\.gemini\\antigravity-cli\\brain\\c9953aa8-d688-420e-9aff-b5d36d564ca4\\.system_generated\\steps\\2911\\content.md', 'utf8');

const regex = /data-path=["']([^"']+)["']/gi;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log('data-path:', match[1]);
}

const regexJson = /[\w-\/]+\.json/gi;
while ((match = regexJson.exec(content)) !== null) {
  console.log('json:', match[0]);
}
