// src/events/interactionCreate.js

import { Events, EmbedBuilder } from 'discord.js';
import { getConfig } from '../models/index.js';
import { handleAIButtons } from './aiAssistant.js';
import { handleChallengeAIHint } from '../utils/challengeScheduler.js';
import { 
    handlePermissionSelectMenu, 
    handlePermissionButtons, 
    handleAddRoleToLevel, 
    handleRemoveRoleFromLevel,
    handleLineAccessAdd,
    handleLineAccessRemove,
    handleOwnerRemoveSelect,
    handleUserRemoveSelect,
    handleCommandSelect,
    handleCommandLevelSelect,
    handleCommandRemoveSelect
} from '../commands/owner/permissions.js';
import { PermissionLevels, getPermissionLevelName, getUserPermissionLevel } from '../utils/permissions.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            // ═══════════════════════════════════════════════════════════════
            // 🎯 SELECT MENUS
            // ═══════════════════════════════════════════════════════════════
            if (interaction.isStringSelectMenu()) {
                await handleSelectMenu(interaction, client);
                return;
            }
            
            // ═══════════════════════════════════════════════════════════════
            // 🔘 BUTTONS
            // ═══════════════════════════════════════════════════════════════
            if (interaction.isButton()) {
                await handleButton(interaction, client);
                return;
            }

        } catch (error) {
            console.error('❌ Interaction error:', error);
            
            const errorEmbed = {
                color: 0xED4245,
                title: '❌ حدث خطأ',
                description: 'فشل تنفيذ الأمر. حاول مرة تانية.',
                footer: { text: 'Crévion' }
            };

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                } else if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                }
            } catch (replyError) {
                console.error('❌ Could not send error message:', replyError);
            }
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// 🎯 HANDLE SELECT MENUS
// ═══════════════════════════════════════════════════════════════

async function handleSelectMenu(interaction, client) {
    const customId = interaction.customId;
    
    // ───────────────────────────────────────────────────────────────
    // 📚 HELP CATEGORY SELECT
    // ───────────────────────────────────────────────────────────────
    if (customId === 'help_category') {
        await handleHelpCategory(interaction, client);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // 🔒 SECURITY CHECK FOR PERMISSIONS DASHBOARD
    // ───────────────────────────────────────────────────────────────
    if (customId.startsWith('perm_')) {
        // ✅ CHECK IF USER IS OWNER
        const { isOwner } = await import('../utils/permissions.js');
        
        if (!await isOwner(interaction.user.id)) {
            return await interaction.reply({
                embeds: [{
                    color: 0xED4245,
                    title: '🔒 Access Denied',
                    description: '❌ **Owner Only**\n\nYou must be a bot owner to use the permissions dashboard.',
                    footer: { text: 'Crévion Security' }
                }],
                ephemeral: true
            });
        }
    }
    
    // ───────────────────────────────────────────────────────────────
    // 🎛️ PERMISSIONS - Main Menu
    // ───────────────────────────────────────────────────────────────
    if (customId === 'perm_main_menu') {
        await handlePermissionSelectMenu(interaction, client);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // 🎛️ PERMISSIONS - Select Level
    // ───────────────────────────────────────────────────────────────
    if (customId === 'perm_select_level') {
        await handlePermissionSelectMenu(interaction, client);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // ➕ PERMISSIONS - Add Role to Level
    // ───────────────────────────────────────────────────────────────
    if (customId.startsWith('perm_add_role_')) {
        const level = customId.replace('perm_add_role_', '');
        const roleIds = interaction.values;
        await handleAddRoleToLevel(interaction, level, roleIds);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // 🗑️ PERMISSIONS - Remove Role from Level
    // ───────────────────────────────────────────────────────────────
    if (customId.startsWith('perm_remove_role_')) {
        const level = customId.replace('perm_remove_role_', '');
        const roleIds = interaction.values;
        await handleRemoveRoleFromLevel(interaction, level, roleIds);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // 👑 OWNER - Remove Select
    // ───────────────────────────────────────────────────────────────
    if (customId === 'perm_owner_remove_select') {
        await handleOwnerRemoveSelect(interaction);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // 👤 USER - Remove Select
    // ───────────────────────────────────────────────────────────────
    if (customId === 'perm_user_remove_select') {
        await handleUserRemoveSelect(interaction);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // ⚙️ COMMAND - Select Command
    // ───────────────────────────────────────────────────────────────
    if (customId === 'perm_cmd_select') {
        await handleCommandSelect(interaction);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // ⚙️ COMMAND - Select Level
    // ───────────────────────────────────────────────────────────────
    if (customId.startsWith('perm_cmd_level_')) {
        await handleCommandLevelSelect(interaction);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // ⚙️ COMMAND - Remove Select
    // ───────────────────────────────────────────────────────────────
    if (customId === 'perm_cmd_remove_select') {
        await handleCommandRemoveSelect(interaction);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // 📏 LINE ACCESS - Add Roles
    // ───────────────────────────────────────────────────────────────
    if (customId === 'perm_line_add') {
        const roleIds = interaction.values;
        await handleLineAccessAdd(interaction, roleIds);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // 📏 LINE ACCESS - Remove Roles
    // ───────────────────────────────────────────────────────────────
    if (customId === 'perm_line_remove') {
        const roleIds = interaction.values;
        await handleLineAccessRemove(interaction, roleIds);
        return;
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔘 HANDLE BUTTONS
// ═══════════════════════════════════════════════════════════════

async function handleButton(interaction, client) {
    const customId = interaction.customId;

    // ───────────────────────────────────────────────────────────────
    // ℹ️ BOT INFO BUTTON
    // ───────────────────────────────────────────────────────────────
    if (customId === 'bot_info') {
        await handleBotInfo(interaction, client);
        return;
    }

    // ───────────────────────────────────────────────────────────────
    // 🤖 AI ASSISTANT BUTTONS
    // ───────────────────────────────────────────────────────────────
    if (customId.startsWith('clear_context_') || customId.startsWith('explain_more_')) {
        await handleAIButtons(interaction);
        return;
    }

    // ───────────────────────────────────────────────────────────────
    // 🧩 CHALLENGE AI HINT BUTTON
    // ───────────────────────────────────────────────────────────────
    if (customId.startsWith('challenge_ai_hint_')) {
        await handleChallengeAIHint(interaction);
        return;
    }
    
    // ───────────────────────────────────────────────────────────────
    // 🔒 SECURITY CHECK FOR PERMISSIONS DASHBOARD BUTTONS
    // ───────────────────────────────────────────────────────────────
    if (customId.startsWith('perm_')) {
        // ✅ CHECK IF USER IS OWNER
        const { isOwner } = await import('../utils/permissions.js');
        
        if (!await isOwner(interaction.user.id)) {
            return await interaction.reply({
                embeds: [{
                    color: 0xED4245,
                    title: '🔒 Access Denied',
                    description: '❌ **Owner Only**\n\nYou must be a bot owner to use the permissions dashboard.',
                    footer: { text: 'Crévion Security' }
                }],
                ephemeral: true
            });
        }
        
        await handlePermissionButton(interaction, client);
        return;
    }
}

// ═══════════════════════════════════════════════════════════════
// 📚 HELP CATEGORY HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleHelpCategory(interaction, client) {
    try {
        const category = interaction.values[0];
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const userLevel = await getUserPermissionLevel(member);
        
        const commands = Array.from(client.commands.values()).filter(cmd => {
            const cmdCategory = getCommandCategory(cmd);
            const requiredLevel = cmd.permission !== undefined ? cmd.permission : PermissionLevels.EVERYONE;
            return cmdCategory === category && userLevel >= requiredLevel;
        });

        if (commands.length === 0) {
            return await interaction.reply({
                embeds: [{
                    color: 0xFEE75C,
                    description: '⚠️ لا توجد أوامر متاحة في هذا القسم'
                }],
                ephemeral: true
            });
        }

        const dbConfig = await getConfig();
        const defaultColor = parseInt(dbConfig?.embedSettings?.defaultColor?.replace('#', '') || '370080', 16);

        const categoryEmbed = new EmbedBuilder()
            .setColor(defaultColor)
            .setTitle(`${getCategoryEmoji(category)} ${getCategoryName(category)}`)
            .setDescription(`جميع الأوامر المتاحة في قسم **${getCategoryName(category)}**:`)
            .addFields(
                commands.map(cmd => ({
                    name: `/${cmd.data.name}`,
                    value: `${cmd.data.description}\n**الصلاحية:** ${getPermissionLevelName(cmd.permission || 0)}`,
                    inline: true
                }))
            )
            .setThumbnail(dbConfig?.embedSettings?.thumbnail)
            .setFooter({
                text: `${dbConfig?.embedSettings?.footer} | استخدم /help [command] للتفاصيل`,
                iconURL: dbConfig?.embedSettings?.footerIcon
            })
            .setTimestamp();

        await interaction.reply({ embeds: [categoryEmbed], ephemeral: true });

    } catch (error) {
        console.error('❌ Help category error:', error);
        await interaction.reply({
            content: '❌ فشل عرض الأوامر',
            ephemeral: true
        }).catch(() => {});
    }
}

// ═══════════════════════════════════════════════════════════════
// ℹ️ BOT INFO HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleBotInfo(interaction, client) {
    try {
        const dbConfig = await getConfig();
        const defaultColor = parseInt(dbConfig?.embedSettings?.defaultColor?.replace('#', '') || '370080', 16);
        
        const embed = new EmbedBuilder()
            .setColor(defaultColor)
            .setAuthor({
                name: dbConfig?.botName || 'Crévion',
                iconURL: dbConfig?.embedSettings?.thumbnail
            })
            .setTitle(`✨ ${dbConfig?.botName || 'Crévion'} - معلومات البوت`)
            .setDescription('صنع بلمسة من الإبداع خصيصاً للمبدعين العرب\n\nبوت متطور لإدارة السيرفر ومساعدة المبدعين')
            .addFields(
                {
                    name: '🎯 المميزات',
                    value: [
                        '🎨 أوامر إبداعية ومبتكرة',
                        '⚡ استجابة سريعة وموثوقة',
                        '🛡️ نظام إدارة قوي',
                        '🤖 مساعد ذكاء اصطناعي متطور',
                        '🎨 أدوات تصميم احترافية',
                        '🧩 تحديات برمجية يومية',
                        '📊 نظام إحصائيات متقدم'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📊 الإحصائيات',
                    value: [
                        `**السيرفرات:** ${client.guilds.cache.size}`,
                        `**المستخدمين:** ${client.users.cache.size}`,
                        `**الأوامر:** ${client.commands.size}`,
                        `**وقت التشغيل:** ${formatUptime(client.stats.startTime)}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: 'ℹ️ معلومات',
                    value: [
                        `**الإصدار:** ${dbConfig?.version || '2.0.0'}`,
                        `**المطور:** Crévion Team`,
                        `**البادئة:** \`${dbConfig?.prefix || '-'}\``
                    ].join('\n'),
                    inline: true
                }
            )
            .setThumbnail(dbConfig?.embedSettings?.thumbnail)
            .setFooter({
                text: dbConfig?.embedSettings?.footer,
                iconURL: dbConfig?.embedSettings?.footerIcon
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('❌ Bot info error:', error);
        await interaction.reply({
            content: '❌ فشل عرض المعلومات',
            ephemeral: true
        }).catch(() => {});
    }
}

// ═══════════════════════════════════════════════════════════════
// 🎛️ PERMISSIONS DASHBOARD HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handlePermissionButton(interaction, client) {
    const customId = interaction.customId;

    // All dashboard buttons
    await handlePermissionButtons(interaction, client);
}

// ═══════════════════════════════════════════════════════════════
// 📝 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getCommandCategory(cmd) {
    const level = cmd.permission || 0;
    
    if (level >= PermissionLevels.OWNER) return 'owner';
    if (level >= PermissionLevels.ADMIN) return 'admin';
    if (level >= PermissionLevels.MODERATOR) return 'moderation';
    if (level >= PermissionLevels.HELPER) return 'creativity';
    return 'general';
}

function getCategoryEmoji(category) {
    const emojis = {
        general: '📂',
        creativity: '🎨',
        moderation: '🛡️',
        admin: '⚙️',
        owner: '👑'
    };
    return emojis[category] || '📁';
}

function getCategoryName(category) {
    const names = {
        general: 'General Commands',
        creativity: 'Creativity & Showcase',
        moderation: 'Moderation',
        admin: 'Administration',
        owner: 'Owner Only'
    };
    return names[category] || category;
}

function formatUptime(startTime) {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    return `${days}d ${hours}h ${minutes}m`;
}