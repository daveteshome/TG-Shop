// Quick test to verify bot environment variables
require('dotenv').config({ path: './apps/backend/.env' });

console.log('=== Bot Environment Check ===');
console.log('WEBAPP_URL:', process.env.WEBAPP_URL);
console.log('BASE_URL:', process.env.BASE_URL);
console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? 'Set ✓' : 'Missing ✗');
console.log('============================');
