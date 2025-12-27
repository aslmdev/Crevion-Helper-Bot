// src/index.js

import { Client, GatewayIntentBits, Events, Collection, ActivityType } from 'discord.js';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { connectDatabase, getConfig, incrementCommandCount, incrementErrorCount } from './models/index.js';
import { initChallengeScheduler } from './utils/challengeScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Discord client with proper intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Bot configuration - Will be loaded from database
let BOT_CONFIG = {
    name: 'Crévion',
    description: 'Crévion Community Helper Bot ✔︎',
    version: '2.0.0',
    color: 0x370080,
    activities: [
        { name: '🌐 crevion.qzz.io', type: ActivityType.Watching },
        { name: '💬 discord.gg/mP9apCqDSZ', type: ActivityType.Playing },
        { name: '🎨 The World Of Creativity', type: ActivityType.Listening },
        { name: '✨ Crévion Community', type: ActivityType.Competing },
    ],
    statusRotationInterval: 15000,
    presence: {
        status: 'idle',
        afk: false
    }
};

// Initialize collections
client.commands = new Collection();
client.prefixCommands = new Collection();
client.config = BOT_CONFIG;

// Database config will be stored here
client.dbConfig = null;

// Stats tracking
client.stats = {
    commandsExecuted: 0,
    errors: 0,
    startTime: Date.now()
};

// Load commands function
async function loadCommands() {
    const commandsPath = join(__dirname, 'commands');
    
    if (!existsSync(commandsPath)) {
        console.error('❌ Commands folder not found!');
        return;
    }

    let loadedCount = 0;
    let errorCount = 0;

    console.log('\n📦 Loading Commands...');
    console.log('='.repeat(60));

    try {
        const folders = readdirSync(commandsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const folder of folders) {
            const folderPath = join(commandsPath, folder);
            const files = readdirSync(folderPath).filter(f => f.endsWith('.js'));

            if (files.length > 0) {
                console.log(`\n📁 ${folder}/`);
            }

            for (const file of files) {
                try {
                    const fileUrl = pathToFileURL(join(folderPath, file)).href;
                    const { default: command } = await import(fileUrl);
                    
                    if (command?.data && command?.execute) {
                        client.commands.set(command.data.name, command);
                        
                        // Register prefix alias if exists
                        if (command.prefixAlias) {
                            client.prefixCommands.set(command.prefixAlias, command);
                        }
                        
                        const permLevel = command.permission !== undefined ? `[${command.permission}]` : '';
                        console.log(`   ✅ ${command.data.name.padEnd(20)} ${permLevel}`);
                        loadedCount++;
                    } else {
                        console.warn(`   ⚠️  ${file.padEnd(20)} - Invalid structure`);
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`   ❌ ${file.padEnd(20)} - ${error.message}`);
                    errorCount++;
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Commands loaded: ${loadedCount}`);
        if (errorCount > 0) {
            console.log(`⚠️  Errors: ${errorCount}`);
        }
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Fatal error loading commands:', error);
        process.exit(1);
    }
}

// Load events function
async function loadEvents() {
    const eventsPath = join(__dirname, 'events');
    
    if (!existsSync(eventsPath)) {
        console.warn('⚠️  Events folder not found!');
        return;
    }

    let loadedCount = 0;
    let errorCount = 0;

    console.log('🎯 Loading Events...');
    console.log('='.repeat(60));

    try {
        const files = readdirSync(eventsPath).filter(f => f.endsWith('.js'));

        console.log(`📁 Found ${files.length} event files in: ${eventsPath}\n`);

        for (const file of files) {
            try {
                const fileUrl = pathToFileURL(join(eventsPath, file)).href;
                console.log(`   Loading: ${file}...`);
                
                const { default: event } = await import(fileUrl);

                if (event?.name && typeof event.execute === 'function') {
                    if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args, client));
                    } else {
                        client.on(event.name, (...args) => event.execute(...args, client));
                    }
                    
                    const onceLabel = event.once ? '(once)' : '';
                    console.log(`   ✅ ${file.padEnd(25)} → ${event.name.padEnd(20)} ${onceLabel}`);
                    loadedCount++;
                } else {
                    console.warn(`   ⚠️  ${file.padEnd(25)} - Invalid structure (missing name or execute)`);
                    errorCount++;
                }
            } catch (error) {
                console.error(`   ❌ ${file.padEnd(25)} - ${error.message}`);
                console.error(`       Stack: ${error.stack?.split('\n')[1]?.trim()}`);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Events loaded: ${loadedCount}`);
        if (errorCount > 0) {
            console.log(`⚠️  Errors: ${errorCount}`);
        }
        console.log('='.repeat(60) + '\n');

        // Debug: Check if MessageCreate is registered
        console.log('🔍 Debug: Checking Event Listeners...');
        console.log(`   Registered events: ${client.eventNames().join(', ')}`);
        const messageCreateCount = client.listenerCount('messageCreate');
        console.log(`   MessageCreate listeners: ${messageCreateCount}`);
        
        if (messageCreateCount === 0) {
            console.error('   ❌ WARNING: No MessageCreate listeners found!');
        } else {
            console.log(`   ✅ MessageCreate is registered with ${messageCreateCount} listener(s)`);
        }
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Fatal error loading events:', error);
        process.exit(1);
    }
}

// Status rotation function
function setCustomStatus() {
    let currentIndex = 0;

    const updateStatus = async () => {
        try {
            // Get status from database
            const dbConfig = await getConfig();
            const savedStatus = dbConfig?.status || 'idle';
            
            const activity = BOT_CONFIG.activities[currentIndex];
            client.user.setPresence({
                activities: [activity],
                status: savedStatus, // Use status from database
                afk: BOT_CONFIG.presence.afk
            });

            currentIndex = (currentIndex + 1) % BOT_CONFIG.activities.length;
        } catch (error) {
            console.error('❌ Error updating status:', error.message);
        }
    };

    updateStatus();
    client.statusRotation = setInterval(updateStatus, BOT_CONFIG.statusRotationInterval);
}

// Slash command handler
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    try {
        // Get config from database
        const dbConfig = client.dbConfig || await getConfig();
        
        // Permission check using database permissions
        if (cmd.permission !== undefined) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            
            // Import hasPermission
            const { hasPermission } = await import('./utils/permissions.js');
            const hasAccess = await hasPermission(member, interaction.commandName, cmd.permission);
            
            if (!hasAccess) {
                const { getPermissionErrorMessage, getPermissionLevelName } = await import('./utils/permissions.js');
                return await interaction.reply(getPermissionErrorMessage(cmd.permission));
            }
        }

        // Execute command
        await cmd.execute(interaction, client);
        
        // Increment counter in database
        await incrementCommandCount();
        
        console.log(`📝 ${interaction.user.tag} used /${interaction.commandName}`);
        
    } catch (err) {
        console.error(`❌ Error in command ${interaction.commandName}:`, err);
        
        // Increment error counter in database
        await incrementErrorCount();
        
        const errorMessage = {
            embeds: [{
                color: 0xED4245,
                title: '❌ حدث خطأ',
                description: 'حدث خطأ أثناء تنفيذ الأمر. يرجى المحاولة مرة أخرى.',
                footer: { text: 'Crévion Community' }
            }],
            ephemeral: true
        };

        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(errorMessage);
            } else if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            }
        } catch (replyError) {
            console.error('❌ Could not send error message:', replyError.message);
        }
    }
});

// Ready event
client.once(Events.ClientReady, async readyClient => {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 BOT IS READY!');
    console.log('='.repeat(60));
    console.log(`🤖 Logged in as: ${readyClient.user.tag}`);
    console.log(`🆔 Client ID: ${readyClient.user.id}`);
    console.log(`🌐 Servers: ${readyClient.guilds.cache.size}`);
    console.log(`👥 Users: ${readyClient.users.cache.size}`);
    console.log(`⚡ Slash Commands: ${client.commands.size}`);
    console.log(`💬 Prefix Commands: ${client.prefixCommands.size}`);
    
    // Load config from database
    try {
        const firstGuild = readyClient.guilds.cache.first();
        client.dbConfig = await getConfig();
        
        // Update guild info in database if changed
        if (client.dbConfig && (!client.dbConfig.guildId || client.dbConfig.guildId !== firstGuild.id)) {
            const { updateConfig } = await import('./models/index.js');
            await updateConfig({
                guildId: firstGuild.id,
                guildName: firstGuild.name
            });
        }
        
        console.log(`📌 Prefix: ${client.dbConfig?.prefix || '-'}`);
        console.log(`🗃️  Database Config Loaded`);
    } catch (error) {
        console.error('⚠️  Could not load database config:', error.message);
        console.log(`📌 Prefix: - (fallback)`);
    }
    
    console.log('='.repeat(60) + '\n');

    setCustomStatus();
    
    // 🧩 Start Daily Challenge Scheduler
    try {
        initChallengeScheduler(readyClient);
        console.log('✅ Daily Challenge Scheduler initialized');
    } catch (error) {
        console.error('⚠️  Challenge Scheduler failed:', error.message);
    }
    
    // 🎤 Auto-join voice channel
    try {
        const { autoJoinVoice } = await import('./commands/owner/voice.js');
        await autoJoinVoice(readyClient);
    } catch (error) {
        console.log('ℹ️  Voice auto-join skipped:', error.message);
    }
});

// Permission check using database
async function checkPermissionFromDB(member, requiredLevel, dbConfig) {
    // This function is now deprecated - using permissions.js instead
    // Kept for compatibility
    const { getUserPermissionLevel } = await import('./utils/permissions.js');
    const userLevel = await getUserPermissionLevel(member);
    return userLevel >= requiredLevel;
}

// Error handlers
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    try {
        await client.destroy();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:');
    console.error(error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:');
    console.error(error);
    if (error.message?.includes('FATAL') || error.code === 'ECONNRESET') {
        console.error('💀 Fatal error detected, exiting...');
        process.exit(1);
    }
});

// Startup sequence
async function start() {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 Starting Crevion Bot...');
        console.log('='.repeat(60));
        
        // Connect to MongoDB FIRST
        console.log('🗃️  Connecting to MongoDB...');
        await connectDatabase();
        
        await loadCommands();
        await loadEvents();
        
        console.log('🔐 Logging in to Discord...\n');
        await client.login(process.env.DISCORD_TOKEN);
        
    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ STARTUP FAILED!');
        console.error('='.repeat(60));
        console.error(error);
        console.error('\n💡 Common solutions:');
        console.error('   1. Check your .env file for correct TOKEN and MONGODB_URI');
        console.error('   2. Make sure MongoDB is running');
        console.error('   3. Run: npm install');
        console.error('   4. Run: npm run deploy');
        console.error('='.repeat(60) + '\n');
        process.exit(1);
    }
}

// Start the bot
start();