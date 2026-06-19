const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\manpr\\.gemini\\antigravity-cli\\brain\\c9953aa8-d688-420e-9aff-b5d36d564ca4\\.system_generated\\steps\\1405\\content.md', 'utf8');

const regex = /<img\b[^>]*src=["']([^"']+)["']/gi;
let match;
console.log('Found Images:');
while ((match = regex.exec(content)) !== null) {
  console.log(match[1]);
}
