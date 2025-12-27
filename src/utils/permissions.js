// src/utils/permissions.js

import { getConfig, updateConfig } from '../models/index.js';

// ═══════════════════════════════════════════════════════════════
// 📊 PERMISSION LEVELS
// ═══════════════════════════════════════════════════════════════

export const PermissionLevels = {
    EVERYONE: 0,    // كل الناس
    MEMBER: 1,      // عضو عادي (له صلاحيات showcase وغيره)
    VIP: 2,         // VIP
    HELPER: 3,      // Helper
    MODERATOR: 4,   // مشرف
    ADMIN: 5,       // أدمن
    OWNER: 6        // Owner
};

// ═══════════════════════════════════════════════════════════════
// 🎯 GET USER PERMISSION LEVEL
// ═══════════════════════════════════════════════════════════════

export async function getUserPermissionLevel(member) {
    try {
        const dbConfig = await getConfig();
        
        if (!dbConfig) {
            console.error('⚠️ No database config!');
            return PermissionLevels.EVERYONE;
        }

        const userId = member.id || member.user?.id;
        
        // 1️⃣ Check if Owner (HIGHEST PRIORITY)
        const owners = dbConfig.permissions?.owners || [];
        if (owners.includes(userId)) {
            return PermissionLevels.OWNER;
        }

        // 2️⃣ Check Roles (من الأعلى للأقل)
        const roles = member.roles?.cache || member.roles;
        
        // Admin
        const adminRoles = dbConfig.permissions?.roles?.admin || [];
        if (adminRoles.some(roleId => roles.has(roleId))) {
            return PermissionLevels.ADMIN;
        }
        
        // Moderator
        const modRoles = dbConfig.permissions?.roles?.moderator || [];
        if (modRoles.some(roleId => roles.has(roleId))) {
            return PermissionLevels.MODERATOR;
        }
        
        // Helper
        const helperRoles = dbConfig.permissions?.roles?.helper || [];
        if (helperRoles.some(roleId => roles.has(roleId))) {
            return PermissionLevels.HELPER;
        }
        
        // VIP
        const vipRoles = dbConfig.permissions?.roles?.vip || [];
        if (vipRoles.some(roleId => roles.has(roleId))) {
            return PermissionLevels.VIP;
        }
        
        // Member (المبدعين - يقدروا يستخدموا showcase وغيره)
        const memberRoles = dbConfig.permissions?.roles?.member || [];
        if (memberRoles.some(roleId => roles.has(roleId))) {
            return PermissionLevels.MEMBER;
        }
        
        // 3️⃣ Default: EVERYONE
        return PermissionLevels.EVERYONE;

    } catch (error) {
        console.error('❌ Error getting permission:', error);
        return PermissionLevels.EVERYONE;
    }
}

// ═══════════════════════════════════════════════════════════════
// ✅ CHECK PERMISSION
// ═══════════════════════════════════════════════════════════════

export async function hasPermission(member, commandName, requiredLevel) {
    try {
        const userLevel = await getUserPermissionLevel(member);
        return userLevel >= requiredLevel;
    } catch (error) {
        console.error('❌ Permission check error:', error);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// 📝 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getPermissionLevelName(level) {
    const names = {
        0: 'Everyone',
        1: 'Member',
        2: 'VIP',
        3: 'Helper',
        4: 'Moderator',
        5: 'Admin',
        6: 'Owner'
    };
    return names[level] || 'Unknown';
}

export function getPermissionErrorMessage(requiredLevel) {
    return {
        embeds: [{
            color: 0xED4245,
            title: '🔒 Access Denied',
            description: `You don't have permission to use this command.\n\n**Required Level:** ${getPermissionLevelName(requiredLevel)}\n\n**Need help?** Contact a server administrator.`,
            footer: { text: 'Crévion Community' }
        }],
        ephemeral: true
    };
}

export async function getCommandRequiredLevel(commandName, defaultLevel) {
    return defaultLevel !== undefined ? defaultLevel : PermissionLevels.EVERYONE;
}

export function parsePermissionLevel(level) {
    if (typeof level === 'number') return level;
    
    const levelMap = {
        'everyone': 0,
        'member': 1,
        'vip': 2,
        'helper': 3,
        'moderator': 4,
        'admin': 5,
        'owner': 6
    };
    
    return levelMap[String(level).toLowerCase()] || 0;
}

export async function isOwner(userId) {
    try {
        const dbConfig = await getConfig();
        const owners = dbConfig?.permissions?.owners || [];
        return owners.includes(userId);
    } catch (error) {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// 🎛️ PERMISSION MANAGEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 🔐 CHECK LINE PERMISSION (خط/line command)
// ═══════════════════════════════════════════════════════════════

export async function canUseLineCommand(member) {
    try {
        // Line command needs at least MEMBER level
        const userLevel = await getUserPermissionLevel(member);
        return userLevel >= PermissionLevels.MEMBER;
    } catch (error) {
        console.error('❌ Error checking line permission:', error);
        return false;
    }
}

// Add owner
export async function addOwner(userId) {
    try {
        const dbConfig = await getConfig();
        const owners = dbConfig.permissions?.owners || [];
        
        if (!owners.includes(userId)) {
            owners.push(userId);
            await updateConfig({
                'permissions.owners': owners
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error adding owner:', error);
        return false;
    }
}

// Remove owner
export async function removeOwner(userId) {
    try {
        const dbConfig = await getConfig();
        const owners = dbConfig.permissions?.owners || [];
        
        const newOwners = owners.filter(id => id !== userId);
        await updateConfig({
            'permissions.owners': newOwners
        });
        return true;
    } catch (error) {
        console.error('❌ Error removing owner:', error);
        return false;
    }
}

// Set role permission
export async function setRolePermission(roleId, level) {
    try {
        const levelName = getPermissionLevelName(level).toLowerCase();
        const dbConfig = await getConfig();
        
        const roles = dbConfig.permissions?.roles?.[levelName] || [];
        if (!roles.includes(roleId)) {
            roles.push(roleId);
            
            await updateConfig({
                [`permissions.roles.${levelName}`]: roles
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error setting role permission:', error);
        return false;
    }
}

// Remove role permission
export async function removeRolePermission(roleId) {
    try {
        const dbConfig = await getConfig();
        const allRoles = dbConfig.permissions?.roles || {};
        
        for (const [level, roles] of Object.entries(allRoles)) {
            const newRoles = roles.filter(id => id !== roleId);
            await updateConfig({
                [`permissions.roles.${level}`]: newRoles
            });
        }
        return true;
    } catch (error) {
        console.error('❌ Error removing role permission:', error);
        return false;
    }
}