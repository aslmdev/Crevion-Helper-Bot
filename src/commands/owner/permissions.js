// src/commands/owner/permissions.js

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { PermissionLevels, getPermissionLevelName } from '../../utils/permissions.js';
import { getConfig, updateConfig } from '../../models/index.js';

// ✅ DEFAULT PERMISSIONS (يحافظ على الـ owners)
const DEFAULT_PERMISSIONS = {
    roles: {
        admin: ['1418262364217671791', '1425149336718803155'],
        moderator: ['1416771195101249586'],
        helper: ['1417479428270985257'],
        vip: ['1422281656437313597', '1416461527485120567'],
        member: ['1416461527485120568']
    },
    users: {},
    commands: {},
    lineAccess: ['1418262364217671791', '1425149336718803155', '1416771195101249586']
};

export default {
    data: new SlashCommandBuilder()
        .setName('permissions')
        .setDescription('🎛️ Ultimate Permissions Dashboard (Owner Only)'),
    permission: PermissionLevels.OWNER,
    async execute(interaction, client) {
        await showMainDashboard(interaction, client);
    }
};

// ═══════════════════════════════════════════════════════════════
// 🎛️ MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════

async function showMainDashboard(interaction, client) {
    try {
        const dbConfig = await getConfig();
        
        const stats = {
            owners: dbConfig.permissions?.owners?.length || 0,
            admin: dbConfig.permissions?.roles?.admin?.length || 0,
            moderator: dbConfig.permissions?.roles?.moderator?.length || 0,
            helper: dbConfig.permissions?.roles?.helper?.length || 0,
            vip: dbConfig.permissions?.roles?.vip?.length || 0,
            member: dbConfig.permissions?.roles?.member?.length || 0,
            users: Object.keys(dbConfig.permissions?.users || {}).length,
            commands: Object.keys(dbConfig.permissions?.commands || {}).length,
            lineRoles: dbConfig.permissions?.lineAccess?.length || 0
        };

        const embed = new EmbedBuilder()
            .setColor(0x370080)
            .setAuthor({
                name: 'Crévion Ultimate Permissions System',
                iconURL: client.user.displayAvatarURL()
            })
            .setTitle('🎛️ Advanced Permission Management Dashboard')
            .setDescription(
                '**Welcome to the most powerful permission system!**\n\n' +
                '• Role-based permissions\n' +
                '• User-specific permissions\n' +
                '• Command-level permissions\n' +
                '• Owner management\n' +
                '• Line system access control'
            )
            .addFields(
                {
                    name: '📊 Current Setup',
                    value: [
                        `👑 **Owners:** ${stats.owners}`,
                        `⚙️ **Admins:** ${stats.admin} roles`,
                        `🛡️ **Moderators:** ${stats.moderator} roles`,
                        `💎 **Helpers:** ${stats.helper} roles`,
                        `⭐ **VIPs:** ${stats.vip} roles`,
                        `👥 **Members:** ${stats.member} roles`,
                        `\n🎯 **User Overrides:** ${stats.users}`,
                        `⚙️ **Command Overrides:** ${stats.commands}`,
                        `📏 **Line Access:** ${stats.lineRoles} roles`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🎯 Hierarchy (Top→Bottom)',
                    value: [
                        '**6️⃣ Owner** - Everything',
                        '**5️⃣ Admin** - Full management',
                        '**4️⃣ Moderator** - Moderation',
                        '**3️⃣ Helper** - Help & tools',
                        '**2️⃣ VIP** - VIP features',
                        '**1️⃣ Member** - Creative tools',
                        '**0️⃣ Everyone** - Basic'
                    ].join('\n'),
                    inline: true
                }
            )
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: 'Select an option below' })
            .setTimestamp();

        const mainMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('perm_main_menu')
                    .setPlaceholder('🎯 Select Configuration Type')
                    .addOptions([
                        {
                            label: '👑 Manage Owners',
                            description: 'Add/remove bot owners',
                            value: 'owners',
                            emoji: '👑'
                        },
                        {
                            label: '🎭 Role Permissions',
                            description: 'Configure permissions for Discord roles',
                            value: 'role_perms',
                            emoji: '🎭'
                        },
                        {
                            label: '👤 User Overrides',
                            description: 'Set specific user permissions',
                            value: 'user_perms',
                            emoji: '👤'
                        },
                        {
                            label: '⚙️ Command Permissions',
                            description: 'Override command permission levels',
                            value: 'command_perms',
                            emoji: '⚙️'
                        },
                        {
                            label: '📏 Line System Access',
                            description: 'Control who bot replies to with line',
                            value: 'line_access',
                            emoji: '📏'
                        }
                    ])
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('perm_view_all')
                    .setLabel('View All')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('perm_reset_confirm')
                    .setLabel('Reset to Default')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔄')
            );

        const updateMethod = interaction.replied || interaction.deferred ? 'update' : 'reply';
        await interaction[updateMethod]({ 
            embeds: [embed], 
            components: [mainMenu, buttons],
            ephemeral: false
        });

    } catch (error) {
        console.error('❌ Dashboard error:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: `Failed to load dashboard:\n\`\`\`${error.message}\`\`\``,
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        }).catch(() => {});
    }
}

// ═══════════════════════════════════════════════════════════════
// 👑 MANAGE OWNERS
// ═══════════════════════════════════════════════════════════════

async function showOwnerManagement(interaction) {
    try {
        const dbConfig = await getConfig();
        const owners = dbConfig.permissions?.owners || [];
        
        let ownersList = '*No owners set*';
        if (owners.length > 0) {
            const ownerUsers = await Promise.all(
                owners.map(async id => {
                    try {
                        const user = await interaction.client.users.fetch(id);
                        return `• ${user.tag} (\`${id}\`)`;
                    } catch {
                        return `• Unknown User (\`${id}\`)`;
                    }
                })
            );
            ownersList = ownerUsers.join('\n');
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('👑 Bot Owners Management')
            .setDescription('Owners have **full access** to all bot commands and settings.')
            .addFields(
                { name: '✅ Current Owners', value: ownersList, inline: false },
                { name: '💡 How to Add', value: 'Use the button below or mention a user', inline: false }
            )
            .setFooter({ text: 'Owners cannot be reset' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('perm_owner_add')
                    .setLabel('Add Owner')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('perm_owner_remove')
                    .setLabel('Remove Owner')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖')
                    .setDisabled(owners.length === 0),
                new ButtonBuilder()
                    .setCustomId('perm_back_to_main')
                    .setLabel('◀️ Back')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [embed], components: [buttons] });

    } catch (error) {
        console.error('❌ Owner management error:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// 🎭 ROLE PERMISSIONS
// ═══════════════════════════════════════════════════════════════

async function showRolePermissions(interaction, client) {
    try {
        const levelMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('perm_select_level')
                    .setPlaceholder('🎯 Select Permission Level')
                    .addOptions([
                        { label: '⚙️ Admin', value: 'admin', emoji: '⚙️' },
                        { label: '🛡️ Moderator', value: 'moderator', emoji: '🛡️' },
                        { label: '💎 Helper', value: 'helper', emoji: '💎' },
                        { label: '⭐ VIP', value: 'vip', emoji: '⭐' },
                        { label: '👥 Member', value: 'member', emoji: '👥' }
                    ])
            );

        const embed = new EmbedBuilder()
            .setColor(0x370080)
            .setTitle('🎭 Role Permissions Configuration')
            .setDescription('Select a permission level to configure which Discord roles have that access.')
            .setFooter({ text: 'Changes save automatically' });

        await interaction.update({ embeds: [embed], components: [levelMenu, createBackButton()] });

    } catch (error) {
        console.error('❌ Role perms error:', error);
    }
}

async function showLevelConfig(interaction, level) {
    try {
        const dbConfig = await getConfig();
        const guildRoles = await interaction.guild.roles.fetch();
        
        const configuredRoleIds = dbConfig.permissions?.roles?.[level] || [];
        const configuredRoles = configuredRoleIds
            .map(id => guildRoles.get(id))
            .filter(Boolean);

        const levelInfo = {
            admin: { emoji: '⚙️', name: 'Admin', color: 0xED4245 },
            moderator: { emoji: '🛡️', name: 'Moderator', color: 0xFEE75C },
            helper: { emoji: '💎', name: 'Helper', color: 0x4A90E2 },
            vip: { emoji: '⭐', name: 'VIP', color: 0xFEE75C },
            member: { emoji: '👥', name: 'Member', color: 0x57F287 }
        };

        const info = levelInfo[level];

        const embed = new EmbedBuilder()
            .setColor(info.color)
            .setTitle(`${info.emoji} ${info.name} Permission Configuration`)
            .setDescription(`Configure which Discord roles get **${info.name}** permissions`)
            .addFields(
                {
                    name: '✅ Currently Assigned',
                    value: configuredRoles.length > 0 
                        ? configuredRoles.map(r => `• ${r}`).join('\n')
                        : '*No roles assigned*',
                    inline: false
                }
            )
            .setFooter({ text: 'Use menus below to add/remove roles' });

        const components = [];

        // Add menu
        const availableRoles = Array.from(guildRoles.values())
            .filter(r => !r.managed && r.name !== '@everyone' && !configuredRoleIds.includes(r.id))
            .sort((a, b) => b.position - a.position)
            .slice(0, 25);

        if (availableRoles.length > 0) {
            components.push(new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`perm_add_role_${level}`)
                        .setPlaceholder('➕ Add roles')
                        .setMinValues(1)
                        .setMaxValues(Math.min(availableRoles.length, 5))
                        .addOptions(
                            availableRoles.map(role => ({
                                label: role.name,
                                value: role.id,
                                emoji: info.emoji
                            }))
                        )
                )
            );
        }

        // Remove menu
        if (configuredRoles.length > 0) {
            components.push(new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`perm_remove_role_${level}`)
                        .setPlaceholder('🗑️ Remove roles')
                        .addOptions(
                            configuredRoles.map(role => ({
                                label: role.name,
                                value: role.id,
                                emoji: '🗑️'
                            }))
                        )
                )
            );
        }

        components.push(createBackButton());

        await interaction.update({ embeds: [embed], components });

    } catch (error) {
        console.error('❌ Level config error:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// 👤 USER OVERRIDES
// ═══════════════════════════════════════════════════════════════

async function showUserOverrides(interaction) {
    try {
        const dbConfig = await getConfig();
        const users = dbConfig.permissions?.users || {};
        
        let usersList = '*No user overrides*';
        if (Object.keys(users).length > 0) {
            const userEntries = await Promise.all(
                Object.entries(users).map(async ([id, level]) => {
                    try {
                        const user = await interaction.client.users.fetch(id);
                        return `• ${user.tag} - **${getPermissionLevelName(level)}**`;
                    } catch {
                        return `• Unknown (\`${id}\`) - **${getPermissionLevelName(level)}**`;
                    }
                })
            );
            usersList = userEntries.join('\n');
        }

        const embed = new EmbedBuilder()
            .setColor(0x4A90E2)
            .setTitle('👤 User Permission Overrides')
            .setDescription('Override permission levels for specific users (ignores roles)')
            .addFields(
                { name: '✅ Current Overrides', value: usersList, inline: false }
            )
            .setFooter({ text: 'User overrides take priority over roles' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('perm_user_add')
                    .setLabel('Add Override')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('perm_user_remove')
                    .setLabel('Remove Override')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖')
                    .setDisabled(Object.keys(users).length === 0),
                new ButtonBuilder()
                    .setCustomId('perm_back_to_main')
                    .setLabel('◀️ Back')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [embed], components: [buttons] });

    } catch (error) {
        console.error('❌ User overrides error:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// ⚙️ COMMAND PERMISSIONS
// ═══════════════════════════════════════════════════════════════

async function showCommandPermissions(interaction, client) {
    try {
        const dbConfig = await getConfig();
        const commands = dbConfig.permissions?.commands || {};
        
        let commandsList = '*No command overrides*';
        if (Object.keys(commands).length > 0) {
            commandsList = Object.entries(commands)
                .map(([cmd, level]) => `• \`/${cmd}\` - **${getPermissionLevelName(level)}**`)
                .join('\n');
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('⚙️ Command Permission Overrides')
            .setDescription('Override default permission levels for specific commands')
            .addFields(
                { name: '✅ Current Overrides', value: commandsList, inline: false },
                { name: '💡 Example', value: 'Set `/ping` to Admin-only instead of Everyone', inline: false }
            )
            .setFooter({ text: 'Command overrides take priority' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('perm_cmd_set')
                    .setLabel('Set Override')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('perm_cmd_remove')
                    .setLabel('Remove Override')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
                    .setDisabled(Object.keys(commands).length === 0),
                new ButtonBuilder()
                    .setCustomId('perm_back_to_main')
                    .setLabel('◀️ Back')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [embed], components: [buttons] });

    } catch (error) {
        console.error('❌ Command perms error:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// 📏 LINE ACCESS
// ═══════════════════════════════════════════════════════════════

async function showLineAccess(interaction) {
    try {
        const dbConfig = await getConfig();
        const lineRoles = dbConfig.permissions?.lineAccess || [];
        const guildRoles = await interaction.guild.roles.fetch();
        
        const roleList = lineRoles
            .map(id => guildRoles.get(id))
            .filter(Boolean)
            .map(r => `• ${r}`)
            .join('\n') || '*No roles - Bot won\'t auto-reply*';

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('📏 Line System Access Control')
            .setDescription(
                '**Control who bot replies to with line**\n\n' +
                '⚠️ This is SEPARATE from `/line` commands!\n\n' +
                '**Auto-Reply Roles:**\n' + roleList
            )
            .setFooter({ text: '/line commands are Owner-only' });

        const availableRoles = Array.from(guildRoles.values())
            .filter(r => !r.managed && r.name !== '@everyone' && !lineRoles.includes(r.id))
            .slice(0, 25);

        const components = [];

        if (availableRoles.length > 0) {
            components.push(new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('perm_line_add')
                        .setPlaceholder('➕ Add roles to line access')
                        .setMinValues(1)
                        .setMaxValues(Math.min(availableRoles.length, 5))
                        .addOptions(
                            availableRoles.map(role => ({
                                label: role.name,
                                value: role.id,
                                emoji: '📏'
                            }))
                        )
                )
            );
        }

        if (lineRoles.length > 0) {
            const configuredRoles = lineRoles.map(id => guildRoles.get(id)).filter(Boolean);
            components.push(new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('perm_line_remove')
                        .setPlaceholder('🗑️ Remove roles')
                        .addOptions(
                            configuredRoles.map(role => ({
                                label: role.name,
                                value: role.id,
                                emoji: '🗑️'
                            }))
                        )
                )
            );
        }

        components.push(createBackButton());

        await interaction.update({ embeds: [embed], components });

    } catch (error) {
        console.error('❌ Line access error:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// 📋 VIEW ALL
// ═══════════════════════════════════════════════════════════════

async function showAllPermissions(interaction) {
    try {
        const dbConfig = await getConfig();
        
        const embed = new EmbedBuilder()
            .setColor(0x370080)
            .setTitle('📋 Complete Permissions Overview')
            .setDescription('Full system configuration');

        // Owners
        const owners = dbConfig.permissions?.owners || [];
        if (owners.length > 0) {
            const ownerUsers = await Promise.all(
                owners.slice(0, 10).map(async id => {
                    try {
                        const user = await interaction.client.users.fetch(id);
                        return user.tag;
                    } catch {
                        return `Unknown (${id})`;
                    }
                })
            );
            embed.addFields({
                name: '👑 Owners',
                value: ownerUsers.map(u => `• ${u}`).join('\n'),
                inline: false
            });
        }

        // Roles
        const roles = dbConfig.permissions?.roles || {};
        const guildRoles = await interaction.guild.roles.fetch();
        
        for (const [level, roleIds] of Object.entries(roles)) {
            if (roleIds.length > 0) {
                const roleNames = roleIds
                    .slice(0, 5)
                    .map(id => {
                        const role = guildRoles.get(id);
                        return role ? role.name : `Unknown (${id})`;
                    });
                
                embed.addFields({
                    name: `${getLevelEmoji(level)} ${level.toUpperCase()}`,
                    value: roleNames.map(r => `• ${r}`).join('\n') + (roleIds.length > 5 ? `\n*+${roleIds.length - 5} more*` : ''),
                    inline: true
                });
            }
        }

        // User overrides
        const users = dbConfig.permissions?.users || {};
        if (Object.keys(users).length > 0) {
            const userList = await Promise.all(
                Object.entries(users).slice(0, 5).map(async ([id, level]) => {
                    try {
                        const user = await interaction.client.users.fetch(id);
                        return `• ${user.tag} - ${getPermissionLevelName(level)}`;
                    } catch {
                        return `• Unknown - ${getPermissionLevelName(level)}`;
                    }
                })
            );
            embed.addFields({
                name: '👤 User Overrides',
                value: userList.join('\n'),
                inline: false
            });
        }

        // Command overrides
        const commands = dbConfig.permissions?.commands || {};
        if (Object.keys(commands).length > 0) {
            const cmdList = Object.entries(commands)
                .slice(0, 5)
                .map(([cmd, level]) => `• \`/${cmd}\` - ${getPermissionLevelName(level)}`);
            embed.addFields({
                name: '⚙️ Command Overrides',
                value: cmdList.join('\n'),
                inline: false
            });
        }

        embed.setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('❌ View all error:', error);
        await interaction.reply({
            content: '❌ Failed to load permissions',
            ephemeral: true
        }).catch(() => {});
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔄 RESET TO DEFAULT (✅ KEEPS OWNERS)
// ═══════════════════════════════════════════════════════════════

async function confirmReset(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('⚠️ Confirm Reset')
        .setDescription(
            '**Are you sure you want to reset permissions to default?**\n\n' +
            '✅ **Will Reset:**\n' +
            '• Role permissions\n' +
            '• User overrides\n' +
            '• Command overrides\n' +
            '• Line access roles\n\n' +
            '✅ **Will NOT Reset:**\n' +
            '• Bot owners (safe)\n\n' +
            '⚠️ **This cannot be undone!**'
        );

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('perm_reset_execute')
                .setLabel('Yes, Reset')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('perm_reset_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );

    await interaction.update({ embeds: [embed], components: [buttons] });
}

async function executeReset(interaction) {
    try {
        const dbConfig = await getConfig();
        
        // ✅ KEEP OWNERS - Only reset other permissions
        const currentOwners = dbConfig.permissions?.owners || [];
        
        await updateConfig({
            'permissions': {
                owners: currentOwners, // ✅ PRESERVE OWNERS
                ...DEFAULT_PERMISSIONS
            }
        });

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Reset Complete!')
            .setDescription(
                'Permissions reset to default configuration.\n\n' +
                `✅ **Owners preserved:** ${currentOwners.length}\n` +
                '✅ **Role permissions reset**\n' +
                '✅ **User overrides cleared**\n' +
                '✅ **Command overrides cleared**\n' +
                '✅ **Line access reset**'
            )
            .setFooter({ text: 'Default loaded ✓' })
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

        console.log(`🔄 Permissions reset by ${interaction.user.tag} (Owners preserved)`);

    } catch (error) {
        console.error('❌ Reset error:', error);
        await interaction.update({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to reset permissions.',
                footer: { text: 'Crévion' }
            }],
            components: []
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════

export async function handlePermissionSelectMenu(interaction, client) {
    const value = interaction.values[0];

    if (value === 'owners') {
        await showOwnerManagement(interaction);
    } else if (value === 'role_perms') {
        await showRolePermissions(interaction, client);
    } else if (value === 'user_perms') {
        await showUserOverrides(interaction);
    } else if (value === 'command_perms') {
        await showCommandPermissions(interaction, client);
    } else if (value === 'line_access') {
        await showLineAccess(interaction);
    } else {
        // It's a level selection
        await showLevelConfig(interaction, value);
    }
}

export async function handlePermissionButtons(interaction, client) {
    const customId = interaction.customId;

    if (customId === 'perm_back_to_main') {
        await showMainDashboard(interaction, client);
    } else if (customId === 'perm_reset_confirm') {
        await confirmReset(interaction);
    } else if (customId === 'perm_reset_execute') {
        await executeReset(interaction);
    } else if (customId === 'perm_reset_cancel') {
        await showMainDashboard(interaction, client);
    } else if (customId === 'perm_view_all') {
        await showAllPermissions(interaction);
    } else if (customId === 'perm_owner_add') {
        await handleOwnerAdd(interaction);
    } else if (customId === 'perm_owner_remove') {
        await handleOwnerRemove(interaction);
    } else if (customId === 'perm_user_add') {
        await handleUserAdd(interaction);
    } else if (customId === 'perm_user_remove') {
        await handleUserRemove(interaction);
    } else if (customId === 'perm_cmd_set') {
        await handleCommandSet(interaction, client);
    } else if (customId === 'perm_cmd_remove') {
        await handleCommandRemove(interaction);
    }
}

// ═══════════════════════════════════════════════════════════════
// 👑 OWNER HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleOwnerAdd(interaction) {
    await interaction.reply({
        embeds: [{
            color: 0x4A90E2,
            title: '➕ Add Owner',
            description: 'Reply with the user ID or mention to add as owner.\n\nExample: `1189242141755584674`\n\nType `cancel` to cancel.',
            footer: { text: 'You have 60 seconds to respond' }
        }],
        ephemeral: true
    });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async msg => {
        await msg.delete().catch(() => {});
        
        if (msg.content.toLowerCase() === 'cancel') {
            return await interaction.followUp({
                content: '❌ Cancelled',
                ephemeral: true
            });
        }

        const userId = msg.content.replace(/[<@!>]/g, '');
        
        if (!/^\d{17,19}$/.test(userId)) {
            return await interaction.followUp({
                content: '❌ Invalid user ID',
                ephemeral: true
            });
        }

        try {
            const user = await interaction.client.users.fetch(userId);
            const dbConfig = await getConfig();
            const owners = dbConfig.permissions?.owners || [];

            if (owners.includes(userId)) {
                return await interaction.followUp({
                    content: `⚠️ ${user.tag} is already an owner`,
                    ephemeral: true
                });
            }

            owners.push(userId);
            await updateConfig({ 'permissions.owners': owners });

            await interaction.followUp({
                embeds: [{
                    color: 0x57F287,
                    title: '✅ Owner Added!',
                    description: `${user.tag} has been added as bot owner.`,
                    footer: { text: 'Saved to database ✓' }
                }],
                ephemeral: true
            });
        } catch (error) {
            await interaction.followUp({
                content: '❌ Failed to add owner',
                ephemeral: true
            });
        }
    });
}

async function handleOwnerRemove(interaction) {
    const dbConfig = await getConfig();
    const owners = dbConfig.permissions?.owners || [];
    
    if (owners.length === 0) {
        return await interaction.reply({
            content: '⚠️ No owners to remove',
            ephemeral: true
        });
    }

    const ownerUsers = await Promise.all(
        owners.map(async id => {
            try {
                const user = await interaction.client.users.fetch(id);
                return { label: user.tag, value: id };
            } catch {
                return { label: `Unknown (${id})`, value: id };
            }
        })
    );

    const menu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('perm_owner_remove_select')
                .setPlaceholder('Select owner to remove')
                .addOptions(ownerUsers)
        );

    await interaction.reply({
        embeds: [{
            color: 0xFEE75C,
            title: '🗑️ Remove Owner',
            description: 'Select an owner to remove:',
            footer: { text: 'Owners have full access' }
        }],
        components: [menu],
        ephemeral: true
    });
}

export async function handleOwnerRemoveSelect(interaction) {
    const userId = interaction.values[0];
    const dbConfig = await getConfig();
    const owners = dbConfig.permissions?.owners || [];
    
    if (owners.length === 1 && owners[0] === userId && interaction.user.id === userId) {
        return await interaction.update({
            embeds: [{
                color: 0xED4245,
                title: '❌ Cannot Remove',
                description: 'You cannot remove yourself as the last owner.'
            }],
            components: []
        });
    }

    const newOwners = owners.filter(id => id !== userId);
    await updateConfig({ 'permissions.owners': newOwners });

    let userName = userId;
    try {
        const user = await interaction.client.users.fetch(userId);
        userName = user.tag;
    } catch {}

    await interaction.update({
        embeds: [{
            color: 0x57F287,
            title: '✅ Owner Removed!',
            description: `${userName} has been removed from bot owners.`,
            footer: { text: 'Saved ✓' }
        }],
        components: []
    });
}

// ═══════════════════════════════════════════════════════════════
// 👤 USER OVERRIDE HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleUserAdd(interaction) {
    await interaction.reply({
        embeds: [{
            color: 0x4A90E2,
            title: '➕ Add User Override',
            description: 'Reply with: `<user_id> <level>`\n\nExample: `1189242141755584674 5` (Admin)\n\nLevels: 0=Everyone, 1=Member, 2=VIP, 3=Helper, 4=Moderator, 5=Admin\n\nType `cancel` to cancel.',
            footer: { text: 'You have 60 seconds' }
        }],
        ephemeral: true
    });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async msg => {
        await msg.delete().catch(() => {});
        
        if (msg.content.toLowerCase() === 'cancel') {
            return await interaction.followUp({ content: '❌ Cancelled', ephemeral: true });
        }

        const [userId, levelStr] = msg.content.split(/\s+/);
        const level = parseInt(levelStr);

        if (!/^\d{17,19}$/.test(userId.replace(/[<@!>]/g, '')) || isNaN(level) || level < 0 || level > 5) {
            return await interaction.followUp({
                content: '❌ Invalid format. Use: `<user_id> <level>`',
                ephemeral: true
            });
        }

        const cleanUserId = userId.replace(/[<@!>]/g, '');
        
        try {
            const user = await interaction.client.users.fetch(cleanUserId);
            const dbConfig = await getConfig();
            const users = dbConfig.permissions?.users || {};
            
            users[cleanUserId] = level;
            await updateConfig({ 'permissions.users': users });

            await interaction.followUp({
                embeds: [{
                    color: 0x57F287,
                    title: '✅ User Override Added!',
                    description: `${user.tag} → **${getPermissionLevelName(level)}**`,
                    footer: { text: 'Saved ✓' }
                }],
                ephemeral: true
            });
        } catch (error) {
            await interaction.followUp({ content: '❌ Failed', ephemeral: true });
        }
    });
}

async function handleUserRemove(interaction) {
    const dbConfig = await getConfig();
    const users = dbConfig.permissions?.users || {};
    
    if (Object.keys(users).length === 0) {
        return await interaction.reply({ content: '⚠️ No overrides', ephemeral: true });
    }

    const userOptions = await Promise.all(
        Object.entries(users).map(async ([id, level]) => {
            try {
                const user = await interaction.client.users.fetch(id);
                return { label: `${user.tag} (${getPermissionLevelName(level)})`, value: id };
            } catch {
                return { label: `Unknown (${getPermissionLevelName(level)})`, value: id };
            }
        })
    );

    const menu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('perm_user_remove_select')
                .setPlaceholder('Select user to remove')
                .addOptions(userOptions.slice(0, 25))
        );

    await interaction.reply({
        embeds: [{
            color: 0xFEE75C,
            title: '🗑️ Remove User Override',
            description: 'Select user to remove:'
        }],
        components: [menu],
        ephemeral: true
    });
}

export async function handleUserRemoveSelect(interaction) {
    const userId = interaction.values[0];
    const dbConfig = await getConfig();
    const users = dbConfig.permissions?.users || {};
    
    delete users[userId];
    await updateConfig({ 'permissions.users': users });

    await interaction.update({
        embeds: [{
            color: 0x57F287,
            title: '✅ Removed!',
            description: 'User override removed.',
            footer: { text: 'Saved ✓' }
        }],
        components: []
    });
}

// ═══════════════════════════════════════════════════════════════
// ⚙️ COMMAND OVERRIDE HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleCommandSet(interaction, client) {
    const commandOptions = Array.from(client.commands.values())
        .slice(0, 25)
        .map(cmd => ({
            label: `/${cmd.data.name}`,
            value: cmd.data.name,
            description: `Current: ${getPermissionLevelName(cmd.permission || 0)}`
        }));

    const menu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('perm_cmd_select')
                .setPlaceholder('Select command to override')
                .addOptions(commandOptions)
        );

    await interaction.reply({
        embeds: [{
            color: 0x4A90E2,
            title: '⚙️ Set Command Override',
            description: 'Select a command:'
        }],
        components: [menu],
        ephemeral: true
    });
}

export async function handleCommandSelect(interaction) {
    const commandName = interaction.values[0];
    
    const levelMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`perm_cmd_level_${commandName}`)
                .setPlaceholder('Select permission level')
                .addOptions([
                    { label: '0 - Everyone', value: '0' },
                    { label: '1 - Member', value: '1' },
                    { label: '2 - VIP', value: '2' },
                    { label: '3 - Helper', value: '3' },
                    { label: '4 - Moderator', value: '4' },
                    { label: '5 - Admin', value: '5' },
                    { label: '6 - Owner', value: '6' }
                ])
        );

    await interaction.update({
        embeds: [{
            color: 0x4A90E2,
            title: `⚙️ Override: /${commandName}`,
            description: 'Select new permission level:'
        }],
        components: [levelMenu]
    });
}

export async function handleCommandLevelSelect(interaction) {
    const [, , , commandName] = interaction.customId.split('_');
    const level = parseInt(interaction.values[0]);
    
    const dbConfig = await getConfig();
    const commands = dbConfig.permissions?.commands || {};
    
    commands[commandName] = level;
    await updateConfig({ 'permissions.commands': commands });

    await interaction.update({
        embeds: [{
            color: 0x57F287,
            title: '✅ Override Set!',
            description: `\`/${commandName}\` → **${getPermissionLevelName(level)}**`,
            footer: { text: 'Saved ✓' }
        }],
        components: []
    });
}

async function handleCommandRemove(interaction) {
    const dbConfig = await getConfig();
    const commands = dbConfig.permissions?.commands || {};
    
    if (Object.keys(commands).length === 0) {
        return await interaction.reply({ content: '⚠️ No overrides', ephemeral: true });
    }

    const cmdOptions = Object.entries(commands).map(([cmd, level]) => ({
        label: `/${cmd}`,
        value: cmd,
        description: `Current: ${getPermissionLevelName(level)}`
    }));

    const menu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('perm_cmd_remove_select')
                .setPlaceholder('Select command to remove')
                .addOptions(cmdOptions.slice(0, 25))
        );

    await interaction.reply({
        embeds: [{
            color: 0xFEE75C,
            title: '🗑️ Remove Command Override'
        }],
        components: [menu],
        ephemeral: true
    });
}

export async function handleCommandRemoveSelect(interaction) {
    const commandName = interaction.values[0];
    const dbConfig = await getConfig();
    const commands = dbConfig.permissions?.commands || {};
    
    delete commands[commandName];
    await updateConfig({ 'permissions.commands': commands });

    await interaction.update({
        embeds: [{
            color: 0x57F287,
            title: '✅ Removed!',
            description: `\`/${commandName}\` override removed.`,
            footer: { text: 'Saved ✓' }
        }],
        components: []
    });
}

// ═══════════════════════════════════════════════════════════════
// 📏 LINE ACCESS HANDLERS
// ═══════════════════════════════════════════════════════════════

export async function handleAddRoleToLevel(interaction, level, roleIds) {
    try {
        const dbConfig = await getConfig();
        const currentRoles = dbConfig.permissions?.roles?.[level] || [];
        const newRoles = [...new Set([...currentRoles, ...roleIds])];
        
        await updateConfig({ [`permissions.roles.${level}`]: newRoles });

        await interaction.reply({
            embeds: [{
                color: 0x57F287,
                title: '✅ Roles Added!',
                description: `Added ${roleIds.length} role(s) to **${level.toUpperCase()}**.`,
                footer: { text: 'Saved to database ✓' }
            }],
            ephemeral: true
        });
    } catch (error) {
        console.error('❌ Add role error:', error);
    }
}

export async function handleRemoveRoleFromLevel(interaction, level, roleIds) {
    try {
        const dbConfig = await getConfig();
        const currentRoles = dbConfig.permissions?.roles?.[level] || [];
        const newRoles = currentRoles.filter(id => !roleIds.includes(id));
        
        await updateConfig({ [`permissions.roles.${level}`]: newRoles });

        await interaction.reply({
            embeds: [{
                color: 0x57F287,
                title: '✅ Roles Removed!',
                description: `Removed ${roleIds.length} role(s) from **${level.toUpperCase()}**.`,
                footer: { text: 'Saved ✓' }
            }],
            ephemeral: true
        });
    } catch (error) {
        console.error('❌ Remove error:', error);
    }
}

export async function handleLineAccessAdd(interaction, roleIds) {
    try {
        const dbConfig = await getConfig();
        const current = dbConfig.permissions?.lineAccess || [];
        const updated = [...new Set([...current, ...roleIds])];
        
        await updateConfig({ 'permissions.lineAccess': updated });

        await interaction.reply({
            embeds: [{
                color: 0x57F287,
                title: '✅ Line Access Updated!',
                description: `Added ${roleIds.length} role(s) to line auto-reply.`,
                footer: { text: 'Saved ✓' }
            }],
            ephemeral: true
        });
    } catch (error) {
        console.error('❌ Line add error:', error);
    }
}

export async function handleLineAccessRemove(interaction, roleIds) {
    try {
        const dbConfig = await getConfig();
        const current = dbConfig.permissions?.lineAccess || [];
        const updated = current.filter(id => !roleIds.includes(id));
        
        await updateConfig({ 'permissions.lineAccess': updated });

        await interaction.reply({
            embeds: [{
                color: 0x57F287,
                title: '✅ Removed!',
                description: `Removed ${roleIds.length} role(s) from line access.`,
                footer: { text: 'Saved ✓' }
            }],
            ephemeral: true
        });
    } catch (error) {
        console.error('❌ Line remove error:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function createBackButton() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('perm_back_to_main')
                .setLabel('◀️ Back')
                .setStyle(ButtonStyle.Secondary)
        );
}

function getLevelEmoji(level) {
    const emojis = {
        admin: '⚙️',
        moderator: '🛡️',
        helper: '💎',
        vip: '⭐',
        member: '👥'
    };
    return emojis[level] || '📁';
}