// scripts/audit-whitelabel.js
const fs = require('fs');
const path = require('path');

const FORBIDDEN_TOKENS = [
  'AWS',
  'Amazon',
  'Bedrock',
  'Nova Micro',
  'Nova Canvas',
  'Nova Lite',
  'Llama',
  'ElevenLabs',
  '11Labs',
  'Route 53',
  'CloudFront',
  'SES Relay',
  'Meta Graph API'
];

const SCAN_DIRS = [
  path.join(__dirname, '../apps/web-portal/src'),
  path.join(__dirname, '../packages/ui/src')
];

let leakCount = 0;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(tsx|ts|jsx|js|html|json)$/.test(file)) {
      // Ignore translation dictionary definition keys and technical env files
      if (file.includes('.test.') || file.includes('.spec.')) continue;
      
      const content = fs.readFileSync(fullPath, 'utf8');
      FORBIDDEN_TOKENS.forEach(token => {
        // Match user-visible strings: inside JSX text or template literals
        const regex = new RegExp(`(>|'|"|\`)([^<'"\`]*\\b${token}\\b[^<'"\`]*)`, 'gi');
        let match;
        while ((match = regex.exec(content)) !== null) {
          // Exclude internal code declarations like process.env or import paths
          if (!match[0].includes('process.env') && !match[0].includes('import')) {
            console.error(`🚨 LEAK DETECTED in ${fullPath}: "${token}" exposed in UI string.`);
            leakCount++;
          }
        }
      });
    }
  }
}

console.log("🔍 Scanning client portal for third-party brand leaks...");
SCAN_DIRS.forEach(dir => {
  if (fs.existsSync(dir)) scanDir(dir);
});

if (leakCount > 0) {
  console.error(`\n❌ Failed: ${leakCount} third-party vendor brand leaks found in user-facing code.`);
  process.exit(1);
} else {
  console.log("✅ Audit Passed: 100% Aria proprietary white-label compliance achieved.");
  process.exit(0);
}
