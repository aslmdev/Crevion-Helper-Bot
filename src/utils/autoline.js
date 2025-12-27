// src/utils/autoline.js

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', '..', 'data', 'autolines.json');

class AutoLineSystem {
    constructor() {
        this.channels = this.load();
    }

    load() {
        try {
            const dataDir = join(__dirname, '..', '..', 'data');
            if (!existsSync(dataDir)) {
                mkdirSync(dataDir, { recursive: true });
            }

            if (existsSync(DB_PATH)) {
                const raw = readFileSync(DB_PATH, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (error) {
            console.error('❌ Error loading auto line channels:', error);
        }
        return {};
    }

    save() {
        try {
            writeFileSync(DB_PATH, JSON.stringify(this.channels, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('❌ Error saving auto line channels:', error);
            return false;
        }
    }

    // Add channel to auto line
    add(channelId, guildId) {
        this.channels[channelId] = {
            guildId: guildId,
            addedAt: Date.now(),
            messageCount: 0
        };
        return this.save();
    }

    // Remove channel from auto line
    remove(channelId) {
        if (this.channels[channelId]) {
            delete this.channels[channelId];
            return this.save();
        }
        return false;
    }

    // Check if channel has auto line enabled
    isEnabled(channelId) {
        return !!this.channels[channelId];
    }

    // Get all channels
    getAll() {
        return this.channels;
    }

    // Get channels for specific guild
    getByGuild(guildId) {
        return Object.entries(this.channels)
            .filter(([_, data]) => data.guildId === guildId)
            .map(([channelId, data]) => ({ channelId, ...data }));
    }

    // Increment message count
    incrementCount(channelId) {
        if (this.channels[channelId]) {
            this.channels[channelId].messageCount++;
            this.save();
        }
    }

    // Clear all
    clear() {
        this.channels = {};
        return this.save();
    }

    // Get count
    count() {
        return Object.keys(this.channels).length;
    }
}

export const autoLine = new AutoLineSystem();