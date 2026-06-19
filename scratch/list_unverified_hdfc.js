const fs = require('fs');
const path = require('path');

const hdfcDir = path.join(__dirname, '..', 'data', 'cards', 'hdfc');
const files = fs.readdirSync(hdfcDir).filter(f => f.endsWith('.json'));

console.log('ID,Name,VerificationStatus,LastVerified');

files.forEach(file => {
  const filePath = path.join(hdfcDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  let verified = false;
  if (data.internalNotes && Array.isArray(data.internalNotes)) {
    verified = data.internalNotes.some(note => 
      /card details manually reviewed and verified by user/i.test(note)
    );
  }
  
  if (!verified) {
    console.log(`${data.id},"${data.name}",${data.verificationStatus},${data.lastVerified}`);
  }
});
