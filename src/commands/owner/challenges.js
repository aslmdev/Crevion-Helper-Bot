// src/commands/owner/challenges.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { getConfig, updateConfig } from '../../models/index.js';
import { getChallengeScheduler } from '../../utils/challengeScheduler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('challenges')
        .setDescription('Manage the daily challenge system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable the daily challenge system')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('post-now')
                .setDescription('Post a challenge immediately (for testing)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check challenge system status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-channel')
                .setDescription('Set the forum channel for challenges')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Forum channel for challenges')
                        .setRequired(true)
                )
        ),

    permission: PermissionLevels.OWNER,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'toggle') {
            await handleToggle(interaction);
        } else if (subcommand === 'post-now') {
            await handlePostNow(interaction, client);
        } else if (subcommand === 'status') {
            await handleStatus(interaction, client);
        } else if (subcommand === 'set-channel') {
            await handleSetChannel(interaction);
        }
    }
};

// Toggle challenge system
async function handleToggle(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const dbConfig = await getConfig();
        const currentStatus = dbConfig?.features?.problemSolving || false;
        const newStatus = !currentStatus;

        // Update database
        await updateConfig({
            'features.problemSolving': newStatus
        });

        const embed = new EmbedBuilder()
            .setColor(newStatus ? 0x57F287 : 0xED4245)
            .setTitle(`🧩 Challenge System ${newStatus ? 'Enabled' : 'Disabled'}`)
            .setDescription(
                newStatus 
                    ? '✅ Daily challenges are now **ENABLED**\n\nChallenges will be posted automatically at 12:00 PM Cairo time.' 
                    : '❌ Daily challenges are now **DISABLED**\n\nNo challenges will be posted automatically.'
            )
            .addFields(
                { name: '📊 Status', value: newStatus ? '🟢 Active' : '🔴 Inactive', inline: true },
                { name: '⏰ Post Time', value: '12:00 PM Cairo', inline: true },
                { name: '📍 Channel', value: `<#${dbConfig?.channels?.problemSolving || 'Not Set'}>`, inline: true }
            )
            .setFooter({ text: 'Crévion Challenge System' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        console.log(`🧩 Challenge system ${newStatus ? 'enabled' : 'disabled'} by ${interaction.user.tag}`);

    } catch (error) {
        console.error('❌ Error toggling challenges:', error);
        await interaction.editReply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to toggle challenge system. Check console for details.',
                footer: { text: 'Crévion' }
            }]
        }).catch(() => {});
    }
}

// Post challenge immediately (testing)
async function handlePostNow(interaction, client) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const dbConfig = await getConfig();
        
        if (!dbConfig?.features?.problemSolving) {
            return await interaction.editReply({
                embeds: [{
                    color: 0xED4245,
                    title: '⚠️ System Disabled',
                    description: 'Challenge system is currently disabled.\n\nUse `/challenges toggle` to enable it first.',
                    footer: { text: 'Crévion' }
                }]
            });
        }

        const scheduler = getChallengeScheduler();
        
        if (!scheduler) {
            return await interaction.editReply({
                embeds: [{
                    color: 0xED4245,
                    title: '❌ Error',
                    description: 'Challenge scheduler is not initialized. Try restarting the bot.',
                    footer: { text: 'Crévion' }
                }]
            });
        }

        await interaction.editReply({
            embeds: [{
                color: 0xFEE75C,
                title: '⏳ Posting Challenge...',
                description: 'Please wait while I post a new challenge.',
                footer: { text: 'Crévion' }
            }]
        });

        // Post challenge
        await scheduler.postDailyChallenge();

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Challenge Posted Successfully!')
            .setDescription('A new challenge has been posted in the forum channel.')
            .addFields(
                { name: '📍 Channel', value: `<#${dbConfig?.channels?.problemSolving}>`, inline: true },
                { name: '👤 Posted By', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Crévion Challenge System' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        console.log(`🧩 Manual challenge posted by ${interaction.user.tag}`);

    } catch (error) {
        console.error('❌ Error posting challenge:', error);
        await interaction.editReply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: `Failed to post challenge:\n\`\`\`${error.message}\`\`\``,
                footer: { text: 'Crévion' }
            }]
        }).catch(() => {});
    }
}

// Check status
async function handleStatus(interaction, client) {
    try {
        const dbConfig = await getConfig();
        const isEnabled = dbConfig?.features?.problemSolving || false;
        const scheduler = getChallengeScheduler();
        const channelId = dbConfig?.channels?.problemSolving;

        let channelStatus = '❌ Not Set';
        if (channelId) {
            try {
                const channel = await client.channels.fetch(channelId);
                channelStatus = channel ? `✅ <#${channelId}>` : '⚠️ Invalid Channel';
            } catch {
                channelStatus = '⚠️ Cannot Access Channel';
            }
        }

        const embed = new EmbedBuilder()
            .setColor(isEnabled ? 0x57F287 : 0xED4245)
            .setTitle('🧩 Challenge System Status')
            .setDescription(
                isEnabled 
                    ? '✅ **System is ENABLED**\n\nChallenges will be posted automatically.' 
                    : '❌ **System is DISABLED**\n\nNo automatic challenges will be posted.'
            )
            .addFields(
                { name: '📊 Status', value: isEnabled ? '🟢 Active' : '🔴 Inactive', inline: true },
                { name: '🤖 Scheduler', value: scheduler ? '✅ Running' : '❌ Not Running', inline: true },
                { name: '⏰ Post Time', value: '12:00 PM Cairo', inline: true },
                { name: '📍 Forum Channel', value: channelStatus, inline: false },
                { name: '📝 Commands', value: '`/challenges toggle` - Toggle system\n`/challenges post-now` - Post immediately\n`/challenges set-channel` - Set channel', inline: false }
            )
            .setFooter({ text: 'Crévion Challenge System' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('❌ Error checking status:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to check system status.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        });
    }
}

// Set channel
async function handleSetChannel(interaction) {
    try {
        const channel = interaction.options.getChannel('channel');

        if (!channel.isThreadOnly()) {
            return await interaction.reply({
                embeds: [{
                    color: 0xED4245,
                    title: '❌ Invalid Channel',
                    description: 'Please select a **Forum Channel**.\n\nRegular text channels cannot be used for challenges.',
                    footer: { text: 'Crévion' }
                }],
                ephemeral: true
            });
        }

        // Update database
        await updateConfig({
            'channels.problemSolving': channel.id
        });

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Channel Updated')
            .setDescription(`Challenge channel has been set to ${channel}`)
            .addFields(
                { name: '📍 New Channel', value: `<#${channel.id}>`, inline: true },
                { name: '👤 Set By', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Crévion Challenge System' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        console.log(`🧩 Challenge channel set to ${channel.name} by ${interaction.user.tag}`);

    } catch (error) {
        console.error('❌ Error setting channel:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to set channel. Check console for details.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        });
    }
}