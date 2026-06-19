const fs = require('fs');

const contentPath = 'C:/Users/manpr/.gemini/antigravity-cli/brain/a2548086-4cc8-4879-9b59-6785f4dc6d58/.system_generated/steps/12265/content.md';
if (!fs.existsSync(contentPath)) {
  console.error("Content path doesn't exist:", contentPath);
  process.exit(1);
}

const html = fs.readFileSync(contentPath, 'utf8');
const regex = /<img\b[^>]*>/gi;
let match;
console.log("Image references found on page:");
while ((match = regex.exec(html)) !== null) {
  console.log(match[0]);
}
