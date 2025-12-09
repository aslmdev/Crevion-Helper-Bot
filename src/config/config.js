import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// ⚠️ Critical validation function
function validateConfig() {
    const errors = [];
    
    if (!process.env.DISCORD_TOKEN) {
        errors.push('DISCORD_TOKEN is missing');
    } else if (process.env.DISCORD_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        errors.push('DISCORD_TOKEN is not configured (still using placeholder)');
    }
    
    if (!process.env.CLIENT_ID) {
        errors.push('CLIENT_ID is missing');
    } else if (process.env.CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        errors.push('CLIENT_ID is not configured (still using placeholder)');
    }
    
    if (errors.length > 0) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ CONFIGURATION ERROR!');
        console.error('='.repeat(60));
        console.error('\nMissing or invalid environment variables:');
        errors.forEach(err => console.error(`   ❌ ${err}`));
        console.error('\n💡 Solution:');
        console.error('   1. Open your .env file');
        console.error('   2. Add your bot token and client ID');
        console.error('   3. Get them from: https://discord.com/developers/applications');
        console.error('\n' + '='.repeat(60) + '\n');
        process.exit(1);
    }
}

// Run validation
validateConfig();

export const config = {
    // Bot credentials
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    
    // About the bot
    about: {
        name: 'Crévion',
        tagline: 'صنع بلمسة من الابداع خصيصا للمبدعين العرب',
        description: 'أنا Crévion، بوت Discord مصمم خصيصًا لخدمة مجتمع Crevion. أقدم مجموعة متنوعة من الأوامر والميزات التي تساعد في إدارة السيرفر والتفاعل مع الأعضاء بطريقة إبداعية وممتعة.',
        features: [
            '🎨 أوامر إبداعية ومبتكرة',
            '⚡ استجابة سريعة وموثوقة',
            '🛡️ نظام إدارة قوي',
            '🎉 تفاعل ممتع مع المجتمع',
            '📊 إحصائيات وتقارير مفصلة',
            '🤖 مساعد ذكاء اصطناعي متطور',
            '🎨 أدوات تصميم احترافية'
        ],
        version: '2.0.0',
        developer: 'Crévion Development Team',
        supportServer: 'https://discord.gg/mP9apCqDSZ',
        website: 'https://crevion.qzz.io',
        privacy: 'نحن نحترم خصوصيتك ولا نحفظ أي بيانات شخصية'
    },

    // Bot settings
    settings: {
        prefix: '-',
        defaultColor: 0x370080, // Purple (Crevion brand color)
        errorColor: 0xED4245,    // Red
        successColor: 0x57F287,  // Green
        warningColor: 0xFEE75C,  // Yellow
        embedThumbnail: 'https://media.discordapp.net/attachments/1416900497423597739/1436341479072333888/Untitled166_20251103185926.png?ex=690f40be&is=690def3e&hm=34fce0a277a1a82c652520ea2a6f19b4e1b9532c71c650bbf0c067a26c163b86&=&format=webp&quality=lossless&width=990&height=990',
        embedFooter: 'Crévion Community',
        embedFooterIcon: 'https://media.discordapp.net/attachments/1416900497423597739/1436341479072333888/Untitled166_20251103185926.png?ex=690f40be&is=690def3e&hm=34fce0a277a1a82c652520ea2a6f19b4e1b9532c71c650bbf0c067a26c163b86&=&format=webp&quality=lossless&width=990&height=990'
    },

    // Permissions system
    permissions: {
        owners: [
            '1189242141755584674',
            '1005475237015605370'
        ],
        
        roles: {
            admin: ['1416773625329659916'],
            moderator: ['1416771195101249586'], // Fixed from permissions.json
            helper: ['1416773625329659918'],
            vip: ['1416773625329659919'],
            member: ['@everyone']
        }
    },

    // Server settings
    guild: {
        mainServerId: '1416461527485120566',
        logChannelId: '1416773881284399144'
    },

    // Feature toggles
    features: {
        commandLogging: true,
        errorReporting: true,
        statusRotation: true,
        welcomeMessages: true,
        moderationLogs: true,
        aiAssistant: true,
        colorExtractor: true,
        backgroundRemover: true
    },

    // API Keys (optional)
    apis: {
        removeBg: process.env.REMOVE_BG_API_KEY || null,
        groq: process.env.CLAUDE_API_KEY || null
    },

    // Channel IDs for special features
    channels: {
        colorExtractor: '1437116837228843168',
        backgroundRemover: '1437119020754276452',
        aiAssistant: '1437119111221084261',
        codeShowcase: '1424814715439288454',
        projectShowcase: '1435190203798126602'
    }
};

// Log successful configuration (only in dev mode)
if (process.env.NODE_ENV === 'development') {
    console.log('✅ Configuration loaded successfully');
    console.log(`   → Bot: ${config.about.name} v${config.about.version}`);
    console.log(`   → Prefix: ${config.settings.prefix}`);
    console.log(`   → AI Assistant: ${config.apis.groq ? 'Enabled' : 'Disabled'}`);
    console.log(`   → Background Remover: ${config.apis.removeBg ? 'Enabled' : 'Disabled'}`);
}