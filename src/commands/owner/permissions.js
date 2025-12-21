// // src/commands/owner/permissions.js - ADVANCED DASHBOARD 🎛️

// import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
// import { PermissionLevels, getPermissionLevelName, addOwner, removeOwner, setRolePermission, removeRolePermission } from '../../utils/permissions.js';
// import { getConfig, updateConfig } from '../../models/index.js';

// export default {
//     data: new SlashCommandBuilder()
//         .setName('permissions')
//         .setDescription('🎛️ Manage bot permissions (Owner only)')
//         .addSubcommand(sub =>
//             sub.setName('dashboard')
//                 .setDescription('Open permissions dashboard')
//         )
//         .addSubcommand(sub =>
//             sub.setName('add-owner')
//                 .setDescription('Add bot owner')
//                 .addUserOption(opt => opt
//                     .setName('user')
//                     .setDescription('User to make owner')
//                     .setRequired(true)
//                 )
//         )
//         .addSubcommand(sub =>
//             sub.setName('remove-owner')
//                 .setDescription('Remove bot owner')
//                 .addUserOption(opt => opt
//                     .setName('user')
//                     .setDescription('Owner to remove')
//                     .setRequired(true)
//                 )
//         )
//         .addSubcommand(sub =>
//             sub.setName('setup-role')
//                 .setDescription('Setup role permissions')
//                 .addRoleOption(opt => opt
//                     .setName('role')
//                     .setDescription('Role to configure')
//                     .setRequired(true)
//                 )
//                 .addStringOption(opt => opt
//                     .setName('level')
//                     .setDescription('Permission level')
//                     .setRequired(true)
//                     .addChoices(
//                         { name: '👥 Member (المبدعين)', value: 'member' },
//                         { name: '⭐ VIP', value: 'vip' },
//                         { name: '💎 Helper', value: 'helper' },
//                         { name: '🛡️ Moderator', value: 'moderator' },
//                         { name: '⚙️ Admin', value: 'admin' }
//                     )
//                 )
//         )
//         .addSubcommand(sub =>
//             sub.setName('remove-role')
//                 .setDescription('Remove role from permissions')
//                 .addRoleOption(opt => opt
//                     .setName('role')
//                     .setDescription('Role to remove')
//                     .setRequired(true)
//                 )
//         )
//         .addSubcommand(sub =>
//             sub.setName('view-roles')
//                 .setDescription('View all role permissions')
//         ),

//     permission: PermissionLevels.OWNER,

//     async execute(interaction, client) {
//         const subcommand = interaction.options.getSubcommand();

//         if (subcommand === 'dashboard') {
//             await showDashboard(interaction);
//         } else if (subcommand === 'add-owner') {
//             await handleAddOwner(interaction);
//         } else if (subcommand === 'remove-owner') {
//             await handleRemoveOwner(interaction);
//         } else if (subcommand === 'setup-role') {
//             await handleSetupRole(interaction);
//         } else if (subcommand === 'remove-role') {
//             await handleRemoveRole(interaction);
//         } else if (subcommand === 'view-roles') {
//             await handleViewRoles(interaction);
//         }
//     }
// };

// // ═══════════════════════════════════════════════════════════════
// // 🎛️ DASHBOARD
// // ═══════════════════════════════════════════════════════════════

// async function showDashboard(interaction) {
//     try {
//         const dbConfig = await getConfig();
        
//         const embed = new EmbedBuilder()
//             .setColor(0x370080)
//             .setTitle('🎛️ Permissions Dashboard')
//             .setDescription('**Welcome to the Permissions Management System!**\n\nThis dashboard helps you easily manage who can use the bot.')
//             .addFields(
//                 {
//                     name: '👑 Bot Owners',
//                     value: `${dbConfig.permissions?.owners?.length || 0} owners\nOwners have full access to everything`,
//                     inline: true
//                 },
//                 {
//                     name: '🎭 Role Setup',
//                     value: `Configure which Discord roles get which bot permissions`,
//                     inline: true
//                 },
//                 {
//                     name: '\u200B',
//                     value: '\u200B',
//                     inline: false
//                 },
//                 {
//                     name: '📊 Permission Levels Explained',
//                     value: [
//                         '**👥 Member** - المبدعين (Showcase, Creative tools)',
//                         '**⭐ VIP** - VIP features',
//                         '**💎 Helper** - Help others, minor moderation',
//                         '**🛡️ Moderator** - Moderation commands',
//                         '**⚙️ Admin** - Full server management',
//                         '**👑 Owner** - Everything (bot config)'
//                     ].join('\n'),
//                     inline: false
//                 },
//                 {
//                     name: '💡 How It Works',
//                     value: [
//                         '1️⃣ Use `/permissions setup-role` to assign a Discord role to a bot permission level',
//                         '2️⃣ Anyone with that role gets that permission level',
//                         '3️⃣ Super simple! No complex setup needed'
//                     ].join('\n'),
//                     inline: false
//                 }
//             )
//             .setFooter({ text: 'Use /permissions setup-role to get started' })
//             .setTimestamp();

//         const buttons = new ActionRowBuilder()
//             .addComponents(
//                 new ButtonBuilder()
//                     .setCustomId('perm_view_owners')
//                     .setLabel('View Owners')
//                     .setStyle(ButtonStyle.Primary)
//                     .setEmoji('👑'),
//                 new ButtonBuilder()
//                     .setCustomId('perm_view_roles')
//                     .setLabel('View Roles')
//                     .setStyle(ButtonStyle.Success)
//                     .setEmoji('🎭'),
//                 new ButtonBuilder()
//                     .setCustomId('perm_help')
//                     .setLabel('Help')
//                     .setStyle(ButtonStyle.Secondary)
//                     .setEmoji('❓')
//             );

//         await interaction.reply({ embeds: [embed], components: [buttons], ephemeral: true });

//     } catch (error) {
//         console.error('❌ Dashboard error:', error);
//         await interaction.reply({
//             embeds: [{
//                 color: 0xED4245,
//                 title: '❌ Error',
//                 description: 'Failed to load dashboard.',
//                 footer: { text: 'Crévion' }
//             }],
//             ephemeral: true
//         });
//     }
// }

// // ═══════════════════════════════════════════════════════════════
// // 👑 ADD OWNER
// // ═══════════════════════════════════════════════════════════════

// async function handleAddOwner(interaction) {
//     try {
//         const user = interaction.options.getUser('user');
        
//         const success = await addOwner(user.id);
        
//         if (success) {
//             await interaction.reply({
//                 embeds: [{
//                     color: 0x57F287,
//                     title: '✅ Owner Added',
//                     description: `${user} is now a bot owner!\n\n**Full access granted** to all bot features.`,
//                     fields: [
//                         { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
//                         { name: '🔑 Permissions', value: 'All commands & settings', inline: true }
//                     ],
//                     footer: { text: 'Saved to crevion_db' },
//                     timestamp: new Date()
//                 }],
//                 ephemeral: true
//             });
//         } else {
//             await interaction.reply({
//                 embeds: [{
//                     color: 0xFEE75C,
//                     title: '⚠️ Already Owner',
//                     description: `${user} is already a bot owner.`,
//                     footer: { text: 'Crévion' }
//                 }],
//                 ephemeral: true
//             });
//         }
//     } catch (error) {
//         console.error('❌ Add owner error:', error);
//         await interaction.reply({
//             embeds: [{
//                 color: 0xED4245,
//                 title: '❌ Error',
//                 description: 'Failed to add owner.',
//                 footer: { text: 'Crévion' }
//             }],
//             ephemeral: true
//         });
//     }
// }

// // ═══════════════════════════════════════════════════════════════
// // 🗑️ REMOVE OWNER
// // ═══════════════════════════════════════════════════════════════

// async function handleRemoveOwner(interaction) {
//     try {
//         const user = interaction.options.getUser('user');
        
//         // Prevent removing self if last owner
//         const dbConfig = await getConfig();
//         const owners = dbConfig.permissions?.owners || [];
        
//         if (owners.length === 1 && user.id === interaction.user.id) {
//             return await interaction.reply({
//                 embeds: [{
//                     color: 0xED4245,
//                     title: '❌ Cannot Remove',
//                     description: 'Cannot remove the last owner. Add another owner first.',
//                     footer: { text: 'Crévion' }
//                 }],
//                 ephemeral: true
//             });
//         }
        
//         const success = await removeOwner(user.id);
        
//         if (success) {
//             await interaction.reply({
//                 embeds: [{
//                     color: 0x57F287,
//                     title: '✅ Owner Removed',
//                     description: `${user} is no longer a bot owner.`,
//                     footer: { text: 'Saved to crevion_db' },
//                     timestamp: new Date()
//                 }],
//                 ephemeral: true
//             });
//         } else {
//             await interaction.reply({
//                 embeds: [{
//                     color: 0xFEE75C,
//                     title: '⚠️ Not an Owner',
//                     description: `${user} is not a bot owner.`,
//                     footer: { text: 'Crévion' }
//                 }],
//                 ephemeral: true
//             });
//         }
//     } catch (error) {
//         console.error('❌ Remove owner error:', error);
//         await interaction.reply({
//             embeds: [{
//                 color: 0xED4245,
//                 title: '❌ Error',
//                 description: 'Failed to remove owner.',
//                 footer: { text: 'Crévion' }
//             }],
//             ephemeral: true
//         });
//     }
// }

// // ═══════════════════════════════════════════════════════════════
// // 🎭 SETUP ROLE
// // ═══════════════════════════════════════════════════════════════

// async function handleSetupRole(interaction) {
//     try {
//         const role = interaction.options.getRole('role');
//         const levelStr = interaction.options.getString('level');
        
//         const levelMap = {
//             'member': PermissionLevels.MEMBER,
//             'vip': PermissionLevels.VIP,
//             'helper': PermissionLevels.HELPER,
//             'moderator': PermissionLevels.MODERATOR,
//             'admin': PermissionLevels.ADMIN
//         };
        
//         const level = levelMap[levelStr];
        
//         const success = await setRolePermission(role.id, level);
        
//         const levelEmojis = {
//             'member': '👥',
//             'vip': '⭐',
//             'helper': '💎',
//             'moderator': '🛡️',
//             'admin': '⚙️'
//         };
        
//         if (success) {
//             await interaction.reply({
//                 embeds: [{
//                     color: 0x57F287,
//                     title: '✅ Role Permission Set',
//                     description: `${role} now has **${levelEmojis[levelStr]} ${getPermissionLevelName(level)}** permissions!`,
//                     fields: [
//                         { name: '🎭 Role', value: role.name, inline: true },
//                         { name: '🔑 Level', value: `${levelEmojis[levelStr]} ${getPermissionLevelName(level)}`, inline: true },
//                         { name: '💡 What This Means', value: getPermissionDescription(levelStr), inline: false }
//                     ],
//                     footer: { text: 'Saved to crevion_db • Takes effect immediately' },
//                     timestamp: new Date()
//                 }],
//                 ephemeral: true
//             });
//         } else {
//             await interaction.reply({
//                 embeds: [{
//                     color: 0xFEE75C,
//                     title: '⚠️ Already Set',
//                     description: `${role} already has this permission level.`,
//                     footer: { text: 'Crévion' }
//                 }],
//                 ephemeral: true
//             });
//         }
//     } catch (error) {
//         console.error('❌ Setup role error:', error);
//         await interaction.reply({
//             embeds: [{
//                 color: 0xED4245,
//                 title: '❌ Error',
//                 description: 'Failed to setup role permissions.',
//                 footer: { text: 'Crévion' }
//             }],
//             ephemeral: true
//         });
//     }
// }

// // ═══════════════════════════════════════════════════════════════
// // 🗑️ REMOVE ROLE
// // ═══════════════════════════════════════════════════════════════

// async function handleRemoveRole(interaction) {
//     try {
//         const role = interaction.options.getRole('role');
        
//         const success = await removeRolePermission(role.id);
        
//         if (success) {
//             await interaction.reply({
//                 embeds: [{
//                     color: 0x57F287,
//                     title: '✅ Role Removed',
//                     description: `${role} permissions have been removed.`,
//                     footer: { text: 'Saved to crevion_db' },
//                     timestamp: new Date()
//                 }],
//                 ephemeral: true
//             });
//         } else {
//             await interaction.reply({
//                 embeds: [{
//                     color: 0xFEE75C,
//                     title: '⚠️ Not Found',
//                     description: `${role} is not in the permissions system.`,
//                     footer: { text: 'Crévion' }
//                 }],
//                 ephemeral: true
//             });
//         }
//     } catch (error) {
//         console.error('❌ Remove role error:', error);
//         await interaction.reply({
//             embeds: [{
//                 color: 0xED4245,
//                 title: '❌ Error',
//                 description: 'Failed to remove role.',
//                 footer: { text: 'Crévion' }
//             }],
//             ephemeral: true
//         });
//     }
// }

// // ═══════════════════════════════════════════════════════════════
// // 📋 VIEW ROLES
// // ═══════════════════════════════════════════════════════════════

// async function handleViewRoles(interaction) {
//     try {
//         const dbConfig = await getConfig();
//         const allRoles = dbConfig.permissions?.roles || {};
        
//         const fields = [];
        
//         const levelInfo = {
//             admin: { emoji: '⚙️', name: 'Admins' },
//             moderator: { emoji: '🛡️', name: 'Moderators' },
//             helper: { emoji: '💎', name: 'Helpers' },
//             vip: { emoji: '⭐', name: 'VIPs' },
//             member: { emoji: '👥', name: 'Members (المبدعين)' }
//         };
        
//         for (const [level, info] of Object.entries(levelInfo)) {
//             const roles = allRoles[level] || [];
            
//             if (roles.length > 0) {
//                 const roleList = roles.map(id => `<@&${id}>`).join('\n');
//                 fields.push({
//                     name: `${info.emoji} ${info.name}`,
//                     value: roleList,
//                     inline: true
//                 });
//             }
//         }
        
//         if (fields.length === 0) {
//             return await interaction.reply({
//                 embeds: [{
//                     color: 0xFEE75C,
//                     title: '⚠️ No Roles Configured',
//                     description: 'No roles have been set up yet.\n\nUse `/permissions setup-role` to get started!',
//                     footer: { text: 'Crévion' }
//                 }],
//                 ephemeral: true
//             });
//         }
        
//         const embed = new EmbedBuilder()
//             .setColor(0x370080)
//             .setTitle('🎭 Role Permissions')
//             .setDescription('**All configured role permissions:**')
//             .addFields(fields)
//             .setFooter({ text: 'Crévion Permissions System' })
//             .setTimestamp();
        
//         await interaction.reply({ embeds: [embed], ephemeral: true });
        
//     } catch (error) {
//         console.error('❌ View roles error:', error);
//         await interaction.reply({
//             embeds: [{
//                 color: 0xED4245,
//                 title: '❌ Error',
//                 description: 'Failed to load roles.',
//                 footer: { text: 'Crévion' }
//             }],
//             ephemeral: true
//         });
//     }
// }

// // ═══════════════════════════════════════════════════════════════
// // 📝 HELPERS
// // ═══════════════════════════════════════════════════════════════

// function getPermissionDescription(level) {
//     const descriptions = {
//         'member': 'Can use showcase, creative tools, and basic features',
//         'vip': 'VIP exclusive features + all member permissions',
//         'helper': 'Can help others and use advanced creative tools',
//         'moderator': 'Can moderate server + all helper permissions',
//         'admin': 'Full server management + all permissions'
//     };
//     return descriptions[level] || 'Standard permissions';
// }

// src/commands/admin/permissions.js - ULTIMATE PERMISSIONS DASHBOARD 🚀

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { getConfig, updateConfig } from '../../models/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('permissions')
        .setDescription('🎛️ Advanced Permissions Dashboard'),

    permission: PermissionLevels.ADMIN,

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
        const guildRoles = await interaction.guild.roles.fetch();
        
        // Count configured roles
        const configuredRoles = {
            owner: dbConfig.permissions?.owners?.length || 0,
            admin: dbConfig.permissions?.roles?.admin?.length || 0,
            moderator: dbConfig.permissions?.roles?.moderator?.length || 0,
            helper: dbConfig.permissions?.roles?.helper?.length || 0,
            member: dbConfig.permissions?.roles?.member?.length || 0,
            vip: dbConfig.permissions?.roles?.vip?.length || 0
        };

        const totalConfigured = Object.values(configuredRoles).reduce((a, b) => a + b, 0);

        const embed = new EmbedBuilder()
            .setColor(0x370080)
            .setAuthor({
                name: 'Crévion Permissions Dashboard',
                iconURL: client.user.displayAvatarURL()
            })
            .setTitle('🎛️ Advanced Permission Management System')
            .setDescription(
                '**Welcome to the most advanced permission system!**\n\n' +
                'This dashboard gives you **full control** over who can use what in your server.\n' +
                'Simply assign Discord roles to bot permission levels!'
            )
            .addFields(
                {
                    name: '📊 Current Setup',
                    value: [
                        `👑 **Owners:** ${configuredRoles.owner}`,
                        `⚙️ **Admins:** ${configuredRoles.admin} roles`,
                        `🛡️ **Moderators:** ${configuredRoles.moderator} roles`,
                        `💎 **Helpers:** ${configuredRoles.helper} roles`,
                        `👥 **Members:** ${configuredRoles.member} roles`,
                        `⭐ **VIPs:** ${configuredRoles.vip} roles`,
                        `\n📈 **Total Configured:** ${totalConfigured}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🎯 What Each Level Can Do',
                    value: [
                        '**👑 Owner** - Everything',
                        '**⚙️ Admin** - Full management',
                        '**🛡️ Moderator** - Moderation',
                        '**💎 Helper** - Help & tools',
                        '**👥 Member** - Showcase & creative',
                        '**⭐ VIP** - VIP features',
                        '**🌍 Everyone** - Basic commands'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: false
                },
                {
                    name: '💡 How It Works',
                    value: '1️⃣ Select a **permission level** below\n2️⃣ Choose which **Discord roles** get that level\n3️⃣ Done! Users with those roles get those permissions ✅',
                    inline: false
                }
            )
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: 'Click buttons below to manage permissions' })
            .setTimestamp();

        // Main menu
        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('perm_select_level')
                    .setPlaceholder('🎯 Select Permission Level to Configure')
                    .addOptions([
                        {
                            label: '⚙️ Admin Permissions',
                            description: 'Full server management & bot config',
                            value: 'admin',
                            emoji: '⚙️'
                        },
                        {
                            label: '🛡️ Moderator Permissions',
                            description: 'Moderation commands & tools',
                            value: 'moderator',
                            emoji: '🛡️'
                        },
                        {
                            label: '💎 Helper Permissions',
                            description: 'Help others & creative tools',
                            value: 'helper',
                            emoji: '💎'
                        },
                        {
                            label: '👥 Member Permissions',
                            description: 'Showcase, creative features',
                            value: 'member',
                            emoji: '👥'
                        },
                        {
                            label: '⭐ VIP Permissions',
                            description: 'VIP exclusive features',
                            value: 'vip',
                            emoji: '⭐'
                        }
                    ])
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('perm_manage_owners')
                    .setLabel('Manage Owners')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('👑'),
                new ButtonBuilder()
                    .setCustomId('perm_view_all')
                    .setLabel('View All Permissions')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('perm_reset_all')
                    .setLabel('Reset All')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [selectMenu, buttons],
            ephemeral: false
        });

    } catch (error) {
        console.error('❌ Dashboard error:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to load dashboard.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        }).catch(() => {});
    }
}

// ═══════════════════════════════════════════════════════════════
// 🎭 HANDLE SELECT MENU
// ═══════════════════════════════════════════════════════════════

export async function handlePermissionSelectMenu(interaction) {
    if (interaction.customId === 'perm_select_level') {
        const level = interaction.values[0];
        await showLevelConfig(interaction, level);
    }
}

async function showLevelConfig(interaction, level) {
    try {
        const dbConfig = await getConfig();
        const guildRoles = await interaction.guild.roles.fetch();
        
        // Get configured roles for this level
        const configuredRoleIds = dbConfig.permissions?.roles?.[level] || [];
        const configuredRoles = configuredRoleIds
            .map(id => guildRoles.get(id))
            .filter(Boolean);

        const levelInfo = {
            admin: { emoji: '⚙️', name: 'Admin', color: 0xED4245, description: 'Full server management, bot configuration, all commands' },
            moderator: { emoji: '🛡️', name: 'Moderator', color: 0xFEE75C, description: 'Moderation tools, user management, warnings' },
            helper: { emoji: '💎', name: 'Helper', color: 0x4A90E2, description: 'Help others, creative tools, community support' },
            member: { emoji: '👥', name: 'Member', color: 0x57F287, description: 'Showcase projects, use creative features' },
            vip: { emoji: '⭐', name: 'VIP', color: 0xFEE75C, description: 'VIP exclusive features and perks' }
        };

        const info = levelInfo[level];

        const embed = new EmbedBuilder()
            .setColor(info.color)
            .setTitle(`${info.emoji} ${info.name} Permission Configuration`)
            .setDescription(`**Configure which Discord roles get ${info.name} permissions**\n\n${info.description}`)
            .addFields(
                {
                    name: '✅ Currently Assigned Roles',
                    value: configuredRoles.length > 0 
                        ? configuredRoles.map(r => `• ${r}`).join('\n')
                        : '*No roles assigned yet*',
                    inline: false
                },
                {
                    name: '💡 How to Configure',
                    value: '1️⃣ Click **Add Role** to assign new role\n2️⃣ Click **Remove Role** to remove a role\n3️⃣ Changes take effect immediately!',
                    inline: false
                }
            )
            .setFooter({ text: 'Crévion Permissions System' })
            .setTimestamp();

        // Role select menu (show all server roles)
        const availableRoles = Array.from(guildRoles.values())
            .filter(r => !r.managed && r.name !== '@everyone' && !configuredRoleIds.includes(r.id))
            .sort((a, b) => b.position - a.position)
            .slice(0, 25); // Discord limit

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`perm_add_role_${level}`)
                    .setPlaceholder('🎭 Select role to add')
                    .setMinValues(1)
                    .setMaxValues(Math.min(availableRoles.length, 5))
                    .addOptions(
                        availableRoles.length > 0 
                            ? availableRoles.map(role => ({
                                label: role.name,
                                value: role.id,
                                description: `Position: ${role.position}`,
                                emoji: info.emoji
                            }))
                            : [{
                                label: 'No available roles',
                                value: 'none',
                                description: 'All roles already assigned'
                            }]
                    )
            );

        const removeMenu = configuredRoles.length > 0 
            ? new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`perm_remove_role_${level}`)
                        .setPlaceholder('🗑️ Select role to remove')
                        .addOptions(
                            configuredRoles.map(role => ({
                                label: role.name,
                                value: role.id,
                                description: 'Click to remove',
                                emoji: '🗑️'
                            }))
                        )
                )
            : null;

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('perm_back_to_main')
                    .setLabel('Back to Dashboard')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('◀️')
            );

        const components = [selectMenu];
        if (removeMenu) components.push(removeMenu);
        components.push(buttons);

        await interaction.update({ embeds: [embed], components });

    } catch (error) {
        console.error('❌ Level config error:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to load level configuration.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        }).catch(() => {});
    }
}

// ═══════════════════════════════════════════════════════════════
// ➕ ADD ROLE TO LEVEL
// ═══════════════════════════════════════════════════════════════

export async function handleAddRoleToLevel(interaction, level, roleIds) {
    try {
        const dbConfig = await getConfig();
        const currentRoles = dbConfig.permissions?.roles?.[level] || [];
        
        // Add new roles (avoid duplicates)
        const newRoles = [...new Set([...currentRoles, ...roleIds])];
        
        await updateConfig({
            [`permissions.roles.${level}`]: newRoles
        });

        const addedRoles = roleIds.map(id => `<@&${id}>`).join(', ');

        await interaction.reply({
            embeds: [{
                color: 0x57F287,
                title: '✅ Roles Added Successfully!',
                description: `Added ${addedRoles} to **${level.toUpperCase()}** permissions.\n\n**Changes are live!** ⚡`,
                footer: { text: 'Saved to database' }
            }],
            ephemeral: true
        });

        // Refresh dashboard
        setTimeout(async () => {
            try {
                await showLevelConfig(interaction.message, level);
            } catch (err) {
                console.error('Failed to refresh:', err);
            }
        }, 2000);

    } catch (error) {
        console.error('❌ Add role error:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to add roles.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        }).catch(() => {});
    }
}

// ═══════════════════════════════════════════════════════════════
// 🗑️ REMOVE ROLE FROM LEVEL
// ═══════════════════════════════════════════════════════════════

export async function handleRemoveRoleFromLevel(interaction, level, roleIds) {
    try {
        const dbConfig = await getConfig();
        const currentRoles = dbConfig.permissions?.roles?.[level] || [];
        
        // Remove specified roles
        const newRoles = currentRoles.filter(id => !roleIds.includes(id));
        
        await updateConfig({
            [`permissions.roles.${level}`]: newRoles
        });

        const removedRoles = roleIds.map(id => `<@&${id}>`).join(', ');

        await interaction.reply({
            embeds: [{
                color: 0x57F287,
                title: '✅ Roles Removed',
                description: `Removed ${removedRoles} from **${level.toUpperCase()}** permissions.`,
                footer: { text: 'Saved to database' }
            }],
            ephemeral: true
        });

    } catch (error) {
        console.error('❌ Remove role error:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to remove roles.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        }).catch(() => {});
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔘 HANDLE BUTTONS
// ═══════════════════════════════════════════════════════════════

export async function handlePermissionButtons(interaction, client) {
    const customId = interaction.customId;

    if (customId === 'perm_manage_owners') {
        await showOwnerManagement(interaction);
    } else if (customId === 'perm_view_all') {
        await showAllPermissions(interaction);
    } else if (customId === 'perm_reset_all') {
        await handleResetAll(interaction);
    } else if (customId === 'perm_back_to_main') {
        await showMainDashboard(interaction, client);
    }
}

async function showOwnerManagement(interaction) {
    try {
        const dbConfig = await getConfig();
        const owners = dbConfig.permissions?.owners || [];
        
        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('👑 Bot Owners Management')
            .setDescription('**Owners have FULL ACCESS to everything**\n\nManage who can control the bot completely.')
            .addFields(
                {
                    name: '👑 Current Owners',
                    value: owners.length > 0 
                        ? owners.map(id => `• <@${id}>`).join('\n')
                        : '*No owners configured*',
                    inline: false
                }
            )
            .setFooter({ text: 'Use /config add-owner or /config remove-owner' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('❌ Owner management error:', error);
    }
}

async function showAllPermissions(interaction) {
    try {
        const dbConfig = await getConfig();
        const allRoles = dbConfig.permissions?.roles || {};
        
        const fields = [];
        
        const levelInfo = {
            admin: { emoji: '⚙️', name: 'Admins' },
            moderator: { emoji: '🛡️', name: 'Moderators' },
            helper: { emoji: '💎', name: 'Helpers' },
            member: { emoji: '👥', name: 'Members' },
            vip: { emoji: '⭐', name: 'VIPs' }
        };
        
        for (const [level, info] of Object.entries(levelInfo)) {
            const roles = allRoles[level] || [];
            
            if (roles.length > 0) {
                const roleList = roles.map(id => `<@&${id}>`).join(', ');
                fields.push({
                    name: `${info.emoji} ${info.name}`,
                    value: roleList,
                    inline: false
                });
            }
        }
        
        if (fields.length === 0) {
            fields.push({
                name: '⚠️ No Permissions Configured',
                value: 'Use the dashboard to set up permissions!',
                inline: false
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x370080)
            .setTitle('📋 All Role Permissions')
            .setDescription('**Complete overview of all configured permissions**')
            .addFields(fields)
            .setFooter({ text: 'Crévion Permissions System' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
    } catch (error) {
        console.error('❌ View all error:', error);
    }
}

async function handleResetAll(interaction) {
    await interaction.reply({
        embeds: [{
            color: 0xFEE75C,
            title: '⚠️ Reset All Permissions',
            description: 'Are you sure you want to **reset ALL permissions**?\n\nThis will remove all role configurations (owners will remain).',
            footer: { text: 'This action is irreversible!' }
        }],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('perm_confirm_reset')
                        .setLabel('Yes, Reset All')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⚠️'),
                    new ButtonBuilder()
                        .setCustomId('perm_cancel_reset')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❌')
                )
        ],
        ephemeral: true
    });
}

export async function handleResetConfirm(interaction) {
    try {
        await updateConfig({
            'permissions.roles': {
                admin: [],
                moderator: [],
                helper: [],
                member: [],
                vip: []
            }
        });

        await interaction.update({
            embeds: [{
                color: 0x57F287,
                title: '✅ Permissions Reset',
                description: 'All role permissions have been cleared.\n\nOwners remain unchanged.',
                footer: { text: 'Crévion' }
            }],
            components: []
        });

    } catch (error) {
        console.error('❌ Reset error:', error);
    }
}