import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { autoLine } from '../../utils/autoline.js';
import { config } from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('autoline')
        .setDescription('Manage auto line system (Admin only)')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Enable auto line in a channel')
                .addChannelOption(opt => opt
                    .setName('channel')
                    .setDescription('The channel')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Disable auto line in a channel')
                .addChannelOption(opt => opt
                    .setName('channel')
                    .setDescription('The channel')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all auto line channels')
        ),

    permission: PermissionLevels.ADMIN,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                await handleAdd(interaction, client);
                break;
            case 'remove':
                await handleRemove(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
        }
    }
};

async function handleAdd(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    // Check if line URL is set
    if (!client.lineUrl) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: '❌ Please set a line image first using `/line`'
            }],
            ephemeral: true
        });
    }

    // Check if already enabled
    if (autoLine.isEnabled(channel.id)) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.warningColor,
                description: `⚠️ Auto line is already enabled in ${channel}`
            }],
            ephemeral: true
        });
    }

    const success = autoLine.add(channel.id, interaction.guildId);

    if (success) {
        await interaction.reply({
            embeds: [{
                color: config.settings.successColor,
                title: '✅ Auto Line Enabled',
                description: `The bot will now send the line image after every message in ${channel}`,
                fields: [
                    { name: '📝 Channel', value: `${channel}`, inline: true },
                    { name: '🔗 Line URL', value: `[View Image](${client.lineUrl})`, inline: true }
                ],
                footer: {
                    text: `Enabled by ${interaction.user.tag}`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            }],
            ephemeral: true
        });
    } else {
        await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: '❌ Failed to enable auto line'
            }],
            ephemeral: true
        });
    }
}

async function handleRemove(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (!autoLine.isEnabled(channel.id)) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.warningColor,
                description: `⚠️ Auto line is not enabled in ${channel}`
            }],
            ephemeral: true
        });
    }

    const success = autoLine.remove(channel.id);

    if (success) {
        await interaction.reply({
            embeds: [{
                color: config.settings.successColor,
                description: `✅ Auto line disabled in ${channel}`
            }],
            ephemeral: true
        });
    } else {
        await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: '❌ Failed to disable auto line'
            }],
            ephemeral: true
        });
    }
}

async function handleList(interaction) {
    const channels = autoLine.getByGuild(interaction.guildId);

    if (channels.length === 0) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.warningColor,
                description: '⚠️ No auto line channels configured'
            }],
            ephemeral: true
        });
    }

    const fields = channels.map(data => ({
        name: `📝 <#${data.channelId}>`,
        value: [
            `**Messages:** ${data.messageCount}`,
            `**Added:** <t:${Math.floor(data.addedAt / 1000)}:R>`
        ].join('\n'),
        inline: true
    }));

    await interaction.reply({
        embeds: [{
            color: config.settings.defaultColor,
            title: '📋 Auto Line Channels',
            description: `Total: **${channels.length}** channels`,
            fields,
            footer: {
                text: config.settings.embedFooter,
                icon_url: config.settings.embedFooterIcon
            },
            timestamp: new Date()
        }],
        ephemeral: true
    });
}