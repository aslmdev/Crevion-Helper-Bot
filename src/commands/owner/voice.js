// src/commands/owner/voice.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { PermissionLevels } from '../../utils/permissions.js';
import { getConfig, updateConfig } from '../../models/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('👑 Manage bot voice channel presence (Owner Only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Make bot join a voice channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Voice channel to join')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Make bot leave voice channel')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check bot voice status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-default')
                .setDescription('Set default voice channel for auto-join')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Default voice channel')
                        .setRequired(true)
                )
        ),

    permission: PermissionLevels.OWNER, // ✅ Owner Only

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'join') {
            await handleJoinVoice(interaction, client);
        } else if (subcommand === 'leave') {
            await handleLeaveVoice(interaction, client);
        } else if (subcommand === 'status') {
            await handleVoiceStatus(interaction, client);
        } else if (subcommand === 'set-default') {
            await handleSetDefaultVoice(interaction);
        }
    }
};

// ... (rest of the file stays the same)

async function handleJoinVoice(interaction, client) {
    try {
        let channel = interaction.options.getChannel('channel');
        
        if (!channel) {
            const dbConfig = await getConfig();
            const defaultChannelId = dbConfig?.channels?.defaultVoice;
            
            if (defaultChannelId) {
                channel = await client.channels.fetch(defaultChannelId);
            } else {
                return await interaction.reply({
                    embeds: [{
                        color: 0xFEE75C,
                        title: '⚠️ No Channel Specified',
                        description: 'Please specify a voice channel or set a default one using `/voice set-default`',
                        footer: { text: 'Crévion' }
                    }],
                    ephemeral: true
                });
            }
        }

        if (channel.type !== 2) {
            return await interaction.reply({
                embeds: [{
                    color: 0xED4245,
                    title: '❌ Invalid Channel',
                    description: 'Please select a voice channel, not a text channel.',
                    footer: { text: 'Crévion' }
                }],
                ephemeral: true
            });
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`🎤 Bot joined voice channel: ${channel.name}`);
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    new Promise((resolve, reject) => 
                        connection.on(VoiceConnectionStatus.Ready, resolve)
                    ),
                    new Promise((resolve) => setTimeout(resolve, 5000))
                ]);
            } catch (error) {
                connection.destroy();
            }
        });

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Joined Voice Channel')
            .setDescription(`Bot has joined **${channel.name}**`)
            .addFields(
                { name: '🎤 Channel', value: channel.name, inline: true },
                { name: '🔇 Muted', value: 'Yes', inline: true },
                { name: '🔊 Deafened', value: 'Yes', inline: true },
                { name: '👤 Joined By', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Use /voice leave to disconnect' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('❌ Error joining voice:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: `Failed to join voice channel:\n\`\`\`${error.message}\`\`\``,
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        }).catch(() => {});
    }
}

async function handleLeaveVoice(interaction, client) {
    try {
        const connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            return await interaction.reply({
                embeds: [{
                    color: 0xFEE75C,
                    title: '⚠️ Not in Voice',
                    description: 'Bot is not currently in a voice channel.',
                    footer: { text: 'Crévion' }
                }],
                ephemeral: true
            });
        }

        connection.destroy();

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Left Voice Channel')
            .setDescription('Bot has disconnected from voice channel')
            .addFields(
                { name: '👤 Disconnected By', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Use /voice join to reconnect' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        console.log(`🎤 Bot left voice channel by ${interaction.user.tag}`);

    } catch (error) {
        console.error('❌ Error leaving voice:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to leave voice channel.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        });
    }
}

async function handleVoiceStatus(interaction, client) {
    try {
        const connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            return await interaction.reply({
                embeds: [{
                    color: 0xFEE75C,
                    title: '📊 Voice Status',
                    description: '❌ **Not Connected**\n\nBot is not currently in a voice channel.',
                    fields: [
                        { name: '💡 How to Connect', value: 'Use `/voice join` or `/voice join #channel`', inline: false }
                    ],
                    footer: { text: 'Crévion Voice System' }
                }],
                ephemeral: true
            });
        }

        const channel = client.channels.cache.get(connection.joinConfig.channelId);
        const statusEmojis = {
            [VoiceConnectionStatus.Ready]: '🟢 Connected',
            [VoiceConnectionStatus.Connecting]: '🟡 Connecting',
            [VoiceConnectionStatus.Disconnected]: '🔴 Disconnected',
            [VoiceConnectionStatus.Destroyed]: '⚫ Destroyed'
        };

        const embed = new EmbedBuilder()
            .setColor(0x370080)
            .setTitle('📊 Voice Status')
            .setDescription('✅ **Connected to Voice**')
            .addFields(
                { name: '🎤 Channel', value: channel ? channel.name : 'Unknown', inline: true },
                { name: '📡 Status', value: statusEmojis[connection.state.status] || 'Unknown', inline: true },
                { name: '🔇 Muted', value: 'Yes', inline: true },
                { name: '🔊 Deafened', value: 'Yes', inline: true }
            )
            .setFooter({ text: 'Crévion Voice System' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('❌ Error checking voice status:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to check voice status.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        });
    }
}

async function handleSetDefaultVoice(interaction) {
    try {
        const channel = interaction.options.getChannel('channel');

        if (channel.type !== 2) {
            return await interaction.reply({
                embeds: [{
                    color: 0xED4245,
                    title: '❌ Invalid Channel',
                    description: 'Please select a voice channel.',
                    footer: { text: 'Crévion' }
                }],
                ephemeral: true
            });
        }

        await updateConfig({
            'channels.defaultVoice': channel.id
        });

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Default Voice Channel Set')
            .setDescription(`Default voice channel updated to **${channel.name}**`)
            .addFields(
                { name: '🎤 Channel', value: channel.name, inline: true },
                { name: '🔄 Auto-Join', value: 'Bot will join this channel on startup', inline: true },
                { name: '👤 Set By', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Saved to crevion_db' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        console.log(`🎤 Default voice channel set to: ${channel.name} by ${interaction.user.tag}`);

    } catch (error) {
        console.error('❌ Error setting default voice:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to set default voice channel.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        });
    }
}

export async function autoJoinVoice(client) {
    try {
        const dbConfig = await getConfig();
        const defaultChannelId = dbConfig?.channels?.defaultVoice;

        if (!defaultChannelId) {
            console.log('ℹ️  No default voice channel set, skipping auto-join');
            return;
        }

        const channel = await client.channels.fetch(defaultChannelId).catch(() => null);

        if (!channel || channel.type !== 2) {
            console.warn('⚠️  Default voice channel not found or invalid');
            return;
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`✅ Auto-joined voice channel: ${channel.name}`);
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    new Promise((resolve) => 
                        connection.on(VoiceConnectionStatus.Ready, resolve)
                    ),
                    new Promise((resolve) => setTimeout(resolve, 5000))
                ]);
            } catch (error) {
                console.log('⚠️  Voice connection lost, attempting to reconnect...');
                setTimeout(() => autoJoinVoice(client), 5000);
            }
        });

    } catch (error) {
        console.error('❌ Error in auto-join voice:', error.message);
    }
}