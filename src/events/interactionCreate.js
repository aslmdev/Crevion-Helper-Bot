// src/events/interactionCreate.js - COMPLETE FIX WITH PERMISSIONS DASHBOARD

import { Events, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { getConfig } from '../models/index.js';
import { handleAIButtons } from './aiAssistant.js';
import { handleChallengeAIHint } from '../utils/challengeScheduler.js';
import { 
    handlePermissionSelectMenu, 
    handlePermissionButtons, 
    handleAddRoleToLevel, 
    handleRemoveRoleFromLevel,
    handleResetConfirm 
} from '../commands/admin/permissions.js';
import { PermissionLevels, getPermissionLevelName, getUserPermissionLevel, getCommandRequiredLevel } from '../utils/permissions.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle Select Menu
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction, client);
            return;
        }
        
        // Handle Buttons
        if (interaction.isButton()) {
            await handleButton(interaction, client);
            return;
        }
    }
};

// 🎨 Handle Select Menu Interactions
async function handleSelectMenu(interaction, client) {
    const customId = interaction.customId;
    
    // Help category select
    if (customId === 'help_category') {
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
                    description: '⚠️ No commands found in this category that you have access to'
                }],
                ephemeral: true
            });
        }

        const dbConfig = await getConfig();
        const defaultColor = parseInt(dbConfig?.embedSettings?.defaultColor?.replace('#', '') || '370080', 16);

        const categoryEmbed = {
            color: defaultColor,
            title: `${getCategoryEmoji(category)} ${getCategoryName(category)}`,
            description: `Here are all commands in the **${getCategoryName(category)}** category that you can use:`,
            fields: commands.map(cmd => ({
                name: `/${cmd.data.name}`,
                value: `${cmd.data.description}\n**Permission:** ${getPermissionLevelName(cmd.permission || 0)}`,
                inline: true
            })),
            thumbnail: { url: dbConfig?.embedSettings?.thumbnail },
            footer: {
                text: `${dbConfig?.embedSettings?.footer} | Use /help [command] for details`,
                icon_url: dbConfig?.embedSettings?.footerIcon
            },
            timestamp: new Date()
        };

        await interaction.reply({ embeds: [categoryEmbed], ephemeral: true });
        return;
    }
    
    // ✅ PERMISSIONS DASHBOARD - Select Level
    if (customId === 'perm_select_level') {
        await handlePermissionSelectMenu(interaction);
        return;
    }
    
    // ✅ PERMISSIONS - Add Role
    if (customId.startsWith('perm_add_role_')) {
        const level = customId.replace('perm_add_role_', '');
        const roleIds = interaction.values;
        await handleAddRoleToLevel(interaction, level, roleIds);
        return;
    }
    
    // ✅ PERMISSIONS - Remove Role
    if (customId.startsWith('perm_remove_role_')) {
        const level = customId.replace('perm_remove_role_', '');
        const roleIds = interaction.values;
        await handleRemoveRoleFromLevel(interaction, level, roleIds);
        return;
    }
}

// 🔘 Handle Button Interactions
async function handleButton(interaction, client) {
    const customId = interaction.customId;

    try {
        // Bot Info Button
        if (customId === 'bot_info') {
            await handleBotInfo(interaction, client);
            return;
        }

        // AI Assistant Buttons
        if (customId.startsWith('clear_context_') || customId.startsWith('explain_more_')) {
            await handleAIButtons(interaction);
            return;
        }

        // Challenge AI Hint Button
        if (customId.startsWith('challenge_ai_hint_')) {
            await handleChallengeAIHint(interaction);
            return;
        }
        
        // ✅ PERMISSIONS DASHBOARD BUTTONS
        if (customId.startsWith('perm_')) {
            // Manage owners, view all, reset, back
            if (['perm_manage_owners', 'perm_view_all', 'perm_reset_all', 'perm_back_to_main'].includes(customId)) {
                await handlePermissionButtons(interaction, client);
                return;
            }
            
            // Confirm reset
            if (customId === 'perm_confirm_reset') {
                await handleResetConfirm(interaction);
                return;
            }
            
            // Cancel reset
            if (customId === 'perm_cancel_reset') {
                await interaction.update({
                    embeds: [{
                        color: 0x57F287,
                        title: '✅ Cancelled',
                        description: 'Reset cancelled. No changes made.',
                        footer: { text: 'Crévion' }
                    }],
                    components: []
                });
                return;
            }
        }

        // Showcase buttons (if needed later)
        if (customId.startsWith('copy_code_') || 
            customId.startsWith('download_code_') ||
            customId.startsWith('save_code_') ||
            customId.startsWith('save_project_')) {
            await handleShowcaseButtons(interaction);
            return;
        }

    } catch (error) {
        console.error('❌ Button interaction error:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to process button action.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        }).catch(() => {});
    }
}

// 🤖 Bot Info Handler
async function handleBotInfo(interaction, client) {
    try {
        const dbConfig = await getConfig();
        const defaultColor = parseInt(dbConfig?.embedSettings?.defaultColor?.replace('#', '') || '370080', 16);
        
        const infoEmbed = {
            color: defaultColor,
            author: {
                name: dbConfig?.botName || 'Crévion',
                icon_url: dbConfig?.embedSettings?.thumbnail
            },
            title: `✨ ${dbConfig?.botName || 'Crévion'} - Bot Information`,
            description: 'صنع بلمسة من الابداع خصيصا للمبدعين العرب\n\nأنا Crévion، بوت Discord مصمم خصيصًا لخدمة مجتمع Crevion. أقدم مجموعة متنوعة من الأوامر والميزات التي تساعد في إدارة السيرفر والتفاعل مع الأعضاء.',
            fields: [
                {
                    name: '🎯 Features',
                    value: [
                        '🎨 أوامر إبداعية ومبتكرة',
                        '⚡ استجابة سريعة وموثوقة',
                        '🛡️ نظام إدارة قوي',
                        '🤖 مساعد ذكاء اصطناعي (DeepSeek + Groq)',
                        '🎨 أدوات تصميم احترافية',
                        '🧩 تحديات برمجية يومية من LeetCode',
                        '📊 نظام إحصائيات متقدم'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📊 Statistics',
                    value: [
                        `**Servers:** ${client.guilds.cache.size}`,
                        `**Users:** ${client.users.cache.size}`,
                        `**Commands:** ${client.commands.size}`,
                        `**Uptime:** ${formatUptime(client.stats.startTime)}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: 'ℹ️ Info',
                    value: [
                        `**Version:** ${dbConfig?.version || '2.0.0'}`,
                        `**Developer:** Crévion Team`,
                        `**Prefix:** \`${dbConfig?.prefix || '-'}\``
                    ].join('\n'),
                    inline: true
                }
            ],
            thumbnail: { url: dbConfig?.embedSettings?.thumbnail },
            footer: {
                text: dbConfig?.embedSettings?.footer,
                icon_url: dbConfig?.embedSettings?.footerIcon
            },
            timestamp: new Date()
        };

        await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
    } catch (error) {
        console.error('❌ Error in bot info:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to load bot information.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        }).catch(() => {});
    }
}

// Handle showcase buttons (placeholder)
async function handleShowcaseButtons(interaction) {
    await interaction.reply({
        embeds: [{
            color: 0xFEE75C,
            title: '🚧 Feature Under Development',
            description: 'نحن نعمل على تحسين هذه الميزة!\nستكون متاحة قريباً عند ربط البوت بالموقع.',
            footer: { text: 'Crévion Development' }
        }],
        ephemeral: true
    });
}

// Helper functions
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