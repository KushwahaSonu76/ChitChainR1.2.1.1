const fs = require('fs');
let content = fs.readFileSync('C:/Users/hp/ChitChainR1/onboarded_users.md', 'utf8');
const lines = content.split('\n');
const newLines = lines.map(line => {
  const match = line.match(/^(\d+\.) `(G[A-Z0-9]+)`$/);
  if (match) {
    return `${match[1]} \`${match[2]}\` - [🔍 Verify Account](https://stellar.expert/explorer/testnet/account/${match[2]})`;
  }
  return line;
});
fs.writeFileSync('C:/Users/hp/ChitChainR1/onboarded_users.md', newLines.join('\n'));
console.log("Updated links!");
