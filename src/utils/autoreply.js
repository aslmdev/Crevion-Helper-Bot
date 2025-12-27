// src/utils/autoreply.js

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', '..', 'data', 'autoreplies.json');

class AutoReplySystem {
    constructor() {
        this.replies = this.load();
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
            console.error('❌ Error loading auto replies:', error);
        }
        return {};
    }

    save() {
        try {
            writeFileSync(DB_PATH, JSON.stringify(this.replies, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('❌ Error saving auto replies:', error);
            return false;
        }
    }

    // Add auto reply
    add(trigger, response, options = {}) {
        const triggerLower = trigger.toLowerCase();
        
        this.replies[triggerLower] = {
            trigger: trigger,
            response: response,
            mention: options.mention || false,
            reply: options.reply !== false, // default true
            exact: options.exact || false,
            createdAt: Date.now(),
            uses: 0
        };
        
        return this.save();
    }

    // Remove auto reply
    remove(trigger) {
        const triggerLower = trigger.toLowerCase();
        if (this.replies[triggerLower]) {
            delete this.replies[triggerLower];
            return this.save();
        }
        return false;
    }

    // Get auto reply
    get(trigger) {
        return this.replies[trigger.toLowerCase()] || null;
    }

    // Get all auto replies
    getAll() {
        return this.replies;
    }

    // Check message for triggers
    check(message) {
        const content = message.content.toLowerCase();
        
        for (const [trigger, data] of Object.entries(this.replies)) {
            let matched = false;
            
            if (data.exact) {
                // Exact match
                matched = content === trigger;
            } else {
                // Contains match
                matched = content.includes(trigger);
            }
            
            if (matched) {
                // Increment usage counter
                this.replies[trigger].uses++;
                this.save();
                
                return data;
            }
        }
        
        return null;
    }

    clear() {
        this.replies = {};
        return this.save();
    }

    count() {
        return Object.keys(this.replies).length;
    }
}

export const autoReply = new AutoReplySystem();