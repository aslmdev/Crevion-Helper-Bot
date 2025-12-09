import { config } from '../config/config.js';
import { db } from './database.js';

/**
 * Permission Levels (lowest to highest)
 */
export const PermissionLevels = {
    EVERYONE: 0,      // Everyone
    MEMBER: 1,        // Regular members
    VIP: 2,          // VIP members
    HELPER: 3,       // Helpers
    MODERATOR: 4,    // Moderators
    ADMIN: 5,        // Admins
    OWNER: 6         // Owners only
};

/**
 * Check if user is owner
 */
export function isOwner(userId) {
    return config.permissions.owners.includes(userId);
}

/**
 * Get user's highest permission level (with database support)
 */
export function getUserPermissionLevel(member) {
    // Check if owner first
    if (isOwner(member.user.id)) {
        return PermissionLevels.OWNER;
    }

    // Check database for user-specific permissions
    const userPerm = db.getUserPermission(member.user.id);
    if (userPerm !== null) {
        return userPerm;
    }

    // Check database for role-based permissions
    let highestRoleLevel = -1;
    for (const [roleId, level] of Object.entries(db.getAllRolePermissions())) {
        if (member.roles.cache.has(roleId) && level > highestRoleLevel) {
            highestRoleLevel = level;
        }
    }
    if (highestRoleLevel !== -1) {
        return highestRoleLevel;
    }

    // Fallback to config roles
    if (hasAnyRole(member, config.permissions.roles.admin)) {
        return PermissionLevels.ADMIN;
    }
    
    if (hasAnyRole(member, config.permissions.roles.moderator)) {
        return PermissionLevels.MODERATOR;
    }
    
    if (hasAnyRole(member, config.permissions.roles.helper)) {
        return PermissionLevels.HELPER;
    }
    
    if (hasAnyRole(member, config.permissions.roles.vip)) {
        return PermissionLevels.VIP;
    }
    
    if (hasAnyRole(member, config.permissions.roles.member)) {
        return PermissionLevels.MEMBER;
    }

    return PermissionLevels.EVERYONE;
}

/**
 * Check if member has any of the specified roles
 */
function hasAnyRole(member, roleIds) {
    if (!roleIds || roleIds.length === 0) return false;
    
    // @everyone case
    if (roleIds.includes('@everyone')) return true;
    
    return roleIds.some(roleId => member.roles.cache.has(roleId));
}

/**
 * Check if member has required permission (with dynamic command permissions)
 */
export function hasPermission(member, commandName, requiredLevel) {
    const userLevel = getUserPermissionLevel(member);
    
    // Check if command has custom permission level in database
    const commandPerm = db.getCommandPermission(commandName);
    const finalRequiredLevel = commandPerm !== null ? commandPerm : requiredLevel;
    
    return userLevel >= finalRequiredLevel;
}

/**
 * Get command's required permission level
 */
export function getCommandRequiredLevel(commandName, defaultLevel) {
    const commandPerm = db.getCommandPermission(commandName);
    return commandPerm !== null ? commandPerm : defaultLevel;
}

/**
 * Get permission level name
 */
export function getPermissionLevelName(level) {
    const names = {
        [PermissionLevels.EVERYONE]: 'Everyone',
        [PermissionLevels.MEMBER]: 'Member',
        [PermissionLevels.VIP]: 'VIP',
        [PermissionLevels.HELPER]: 'Helper',
        [PermissionLevels.MODERATOR]: 'Moderator',
        [PermissionLevels.ADMIN]: 'Admin',
        [PermissionLevels.OWNER]: 'Owner'
    };
    return names[level] || 'Unknown';
}

/**
 * Parse permission level from string
 */
export function parsePermissionLevel(levelStr) {
    const normalized = levelStr.toLowerCase();
    const mapping = {
        'everyone': PermissionLevels.EVERYONE,
        'member': PermissionLevels.MEMBER,
        'vip': PermissionLevels.VIP,
        'helper': PermissionLevels.HELPER,
        'mod': PermissionLevels.MODERATOR,
        'moderator': PermissionLevels.MODERATOR,
        'admin': PermissionLevels.ADMIN,
        'owner': PermissionLevels.OWNER
    };
    return mapping[normalized];
}

/**
 * Unified permission error message
 */
export function getPermissionErrorMessage(requiredLevel) {
    return {
        embeds: [{
            color: config.settings.errorColor,
            title: '🔒 Insufficient Permissions',
            description: `This command requires: **${getPermissionLevelName(requiredLevel)}** or higher`,
            footer: {
                text: config.settings.embedFooter,
                icon_url: config.settings.embedFooterIcon
            },
            timestamp: new Date()
        }],
        ephemeral: true
    };
}