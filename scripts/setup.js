import { writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

console.log('🚀 Setting up Dexter Community Bot...');

// Create .env file if it doesn't exist
const envPath = join(projectRoot, '.env');
if (!existsSync(envPath)) {
    const envContent = `# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_test_guild_id_here

# Bot Settings
DEFAULT_PREFIX=!
LOG_CHANNEL=

# Database
DATABASE_URL=./database/bot.db

# Environment
NODE_ENV=development
`;

    writeFileSync(envPath, envContent);
    console.log('✅ Created .env file');
    console.log('⚠️  Please fill in your bot token and client ID in the .env file');
} else {
    console.log('✅ .env file already exists');
}

// Create database directory
const dbDir = join(projectRoot, 'database');
if (!existsSync(dbDir)) {
    import('fs').then(fs => {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('✅ Created database directory');
    });
}

console.log('\n🎉 Setup complete!');
console.log('\nNext steps:');
console.log('1. Fill in your bot token and client ID in .env');
console.log('2. Run: npm install');
console.log('3. Run: npm run deploy (to register slash commands)');
console.log('4. Run: npm start (to start the bot)');
