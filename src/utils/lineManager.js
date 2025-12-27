// src/utils/lineManager.js

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', '..', 'data', 'line-config.json');

class LineManager {
    constructor() {
        this.config = this.load();
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
            console.error('❌ Error loading line config:', error);
        }
        
        return {
            url: null,
            allowedRoles: [], // Roles that can use /line and trigger "خط/line"
            lastUpdated: null,
            updatedBy: null
        };
    }

    save() {
        try {
            writeFileSync(DB_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('❌ Error saving line config:', error);
            return false;
        }
    }

    // Set line URL
    setUrl(url, userId) {
        this.config.url = url;
        this.config.lastUpdated = Date.now();
        this.config.updatedBy = userId;
        return this.save();
    }

    // Get line URL
    getUrl() {
        return this.config.url;
    }

    // Add allowed role
    addRole(roleId) {
        if (!this.config.allowedRoles.includes(roleId)) {
            this.config.allowedRoles.push(roleId);
            return this.save();
        }
        return false;
    }

    // Remove allowed role
    removeRole(roleId) {
        const index = this.config.allowedRoles.indexOf(roleId);
        if (index > -1) {
            this.config.allowedRoles.splice(index, 1);
            return this.save();
        }
        return false;
    }

    // Get allowed roles
    getAllowedRoles() {
        return this.config.allowedRoles;
    }

    // Check if member has allowed role
    hasPermission(member) {
        if (this.config.allowedRoles.length === 0) return false;
        return this.config.allowedRoles.some(roleId => member.roles.cache.has(roleId));
    }

    // Get config
    getConfig() {
        return this.config;
    }

    // Clear all
    clear() {
        this.config = {
            url: null,
            allowedRoles: [],
            lastUpdated: null,
            updatedBy: null
        };
        return this.save();
    }
}

export const lineManager = new LineManager();