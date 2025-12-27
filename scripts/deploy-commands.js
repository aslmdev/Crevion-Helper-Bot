import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ ERROR: DISCORD_TOKEN is missing in .env file!');
    console.log('💡 Please add your bot token to the .env file');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('❌ ERROR: CLIENT_ID is missing in .env file!');
    console.log('💡 Please add your bot client ID to the .env file');
    process.exit(1);
}

const commands = [];
const commandsPath = join(__dirname, '..', 'src', 'commands');

console.log('\n' + '='.repeat(60));
console.log('🚀 Starting Command Deployment Process...');
console.log('='.repeat(60) + '\n');

// Load all commands
try {
    const folders = readdirSync(commandsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    console.log(`📁 Found ${folders.length} command folders\n`);

    for (const folder of folders) {
        const folderPath = join(commandsPath, folder);
        const files = readdirSync(folderPath).filter(f => f.endsWith('.js'));

        console.log(`📂 Loading commands from: ${folder}/`);

        for (const file of files) {
            try {
                const fileUrl = pathToFileURL(join(folderPath, file)).href;
                const { default: command } = await import(fileUrl);

                if (command?.data && command?.execute) {
                    commands.push(command.data.toJSON());
                    console.log(`   ✅ ${command.data.name.padEnd(20)} - ${command.data.description}`);
                } else {
                    console.warn(`   ⚠️  ${file.padEnd(20)} - Missing data or execute function`);
                }
            } catch (error) {
                console.error(`   ❌ ${file.padEnd(20)} - Error: ${error.message}`);
            }
        }
        console.log('');
    }

    console.log('='.repeat(60));
    console.log(`📦 Total commands loaded: ${commands.length}`);
    console.log('='.repeat(60) + '\n');

} catch (error) {
    console.error('❌ Fatal error while loading commands:', error);
    process.exit(1);
}

// Deploy commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Started refreshing application (/) commands...\n');

        // Deploy globally (for all servers)
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('✅ Successfully deployed commands!\n');
        console.log('='.repeat(60));
        console.log(`🎉 Deployment Summary:`);
        console.log(`   • Commands Deployed: ${data.length}`);
        console.log(`   • Deployment Type: Global (All Servers)`);
        console.log(`   • Status: Success ✓`);
        console.log('='.repeat(60) + '\n');

        console.log('💡 Commands will be available in all servers within 1 hour');
        console.log('💡 For instant availability, use guild commands instead\n');

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ DEPLOYMENT FAILED!');
        console.error('='.repeat(60));
        
        if (error.code === 50001) {
            console.error('\n🔒 Error: Missing Access');
            console.error('   → Bot needs to be added to server with applications.commands scope');
        } else if (error.code === 401 || error.status === 401) {
            console.error('\n🔑 Error: Invalid Bot Token');
            console.error('   → Check your DISCORD_TOKEN in .env file');
            console.error('   → Get new token from: https://discord.com/developers/applications');
        } else if (error.code === 10002) {
            console.error('\n🤖 Error: Invalid Application');
            console.error('   → Check your CLIENT_ID in .env file');
        } else {
            console.error('\n📛 Unexpected Error:');
            console.error('   → ' + error.message);
            if (error.rawError) {
                console.error('   → Raw Error:', error.rawError);
            }
        }
        
        console.error('\n' + '='.repeat(60) + '\n');
        process.exit(1);
    }
})();