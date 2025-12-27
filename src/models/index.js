// src/models/index.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crevion_db';

// ═══════════════════════════════════════════════════════════════
// 🔌 MongoDB Connection
// ═══════════════════════════════════════════════════════════════

export async function connectDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected successfully to: crevion_db');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// 📝 SCHEMAS
// ═══════════════════════════════════════════════════════════════

const configSchema = new mongoose.Schema({
    botName: String,
    version: String,
    prefix: String,
    status: String,
    guildId: String,
    guildName: String,
    channels: Object,
    permissions: Object,
    lineConfig: Object,
    embedSettings: Object,
    features: Object,
    apiKeys: Object,
    stats: Object,
    createdAt: Date,
    updatedAt: Date
}, { 
    collection: 'config',
    timestamps: true,
    strict: false
});

const challengeSchema = new mongoose.Schema({}, {
    collection: 'challenges',
    strict: false,
    timestamps: true
});

const projectSchema = new mongoose.Schema({}, { 
    collection: 'projects',
    strict: false,
    timestamps: true
});

const savedItemSchema = new mongoose.Schema({}, {
    collection: 'savedItems',
    strict: false,
    timestamps: true
});

const leaderboardSchema = new mongoose.Schema({}, {
    collection: 'leaderboard',
    strict: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// 📦 MODELS
// ═══════════════════════════════════════════════════════════════

export const Config = mongoose.model('Config', configSchema);
export const Challenge = mongoose.model('Challenge', challengeSchema);
export const Project = mongoose.model('Project', projectSchema);
export const SavedItem = mongoose.model('SavedItem', savedItemSchema);
export const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export async function getConfig() {
    try {
        let config = await Config.findOne();
        
        if (!config) {
            console.log('⚠️  No config found in database, creating default...');
            config = await Config.create({
                botName: 'Crévion',
                version: '2.0.0',
                prefix: '-',
                status: 'idle',
                guildId: '',
                guildName: '',
                channels: {
                    logChannel: '',
                    welcomeChannel: '',
                    aiAssistant: '1437119111221084261',
                    colorExtractor: '1437116837228843168',
                    backgroundRemover: '1437119020754276452',
                    codeShowcase: '1424814715439288454',
                    projectShowcase: '1435190203798126602',
                    problemSolving: '1447987005387575460'
                },
                permissions: {
                    owners: [],
                    roles: {
                        admin: [],
                        moderator: [],
                        helper: [],
                        vip: []
                    }
                },
                lineConfig: {
                    url: null,
                    allowedRoles: [],
                    autoLineChannels: []
                },
                embedSettings: {
                    defaultColor: '#370080',
                    successColor: '#57F287',
                    errorColor: '#ED4245',
                    warningColor: '#FEE75C',
                    thumbnail: 'https://media.discordapp.net/attachments/1416900497423597739/1436341479072333888/Untitled166_20251103185926.png',
                    footer: 'Crévion Community',
                    footerIcon: 'https://media.discordapp.net/attachments/1416900497423597739/1436341479072333888/Untitled166_20251103185926.png'
                },
                features: {
                    commandLogging: true,
                    errorReporting: true,
                    welcomeMessages: true,
                    aiAssistant: true,
                    problemSolving: true
                },
                apiKeys: {
                    removeBg: null,
                    claudeAI: null
                },
                stats: {
                    totalCommands: 0,
                    totalErrors: 0,
                    startTime: new Date()
                }
            });
            console.log('✅ Default config created in database');
        }
        
        return config;
    } catch (error) {
        console.error('❌ Error getting config:', error.message);
        return null;
    }
}

export async function updateConfig(updates) {
    try {
        const config = await Config.findOneAndUpdate(
            {},
            { $set: updates },
            { new: true, upsert: false }
        );
        
        if (!config) {
            console.error('❌ No config document found to update');
            return null;
        }
        
        console.log('✅ Config updated in database');
        return config;
    } catch (error) {
        console.error('❌ Error updating config:', error.message);
        throw error;
    }
}

export async function incrementCommandCount() {
    try {
        await Config.findOneAndUpdate(
            {},
            { $inc: { 'stats.totalCommands': 1 } }
        );
    } catch (error) {
        console.error('❌ Error incrementing command count:', error.message);
    }
}

export async function incrementErrorCount() {
    try {
        await Config.findOneAndUpdate(
            {},
            { $inc: { 'stats.totalErrors': 1 } }
        );
    } catch (error) {
        console.error('❌ Error incrementing error count:', error.message);
    }
}