// src/commands/moderation/say.js

import { SlashCommandBuilder, ChannelType, EmbedBuilder } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { config } from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something (Admin only)')
        .addSubcommand(sub =>
            sub.setName('text')
                .setDescription('Send a plain text message')
                .addStringOption(opt => opt
                    .setName('message')
                    .setDescription('The message text')
                    .setRequired(true))
                .addChannelOption(opt => opt
                    .setName('channel')
                    .setDescription('Channel to send to (default: current)')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('embed')
                .setDescription('Send an embed message')
                .addStringOption(opt => opt
                    .setName('description')
                    .setDescription('Embed description (main content)')
                    .setRequired(true))
                .addStringOption(opt => opt
                    .setName('title')
                    .setDescription('Embed title')
                    .setRequired(false))
                .addStringOption(opt => opt
                    .setName('color')
                    .setDescription('Embed color (hex code like FF0000 without #)')
                    .setRequired(false))
                .addStringOption(opt => opt
                    .setName('image')
                    .setDescription('Image URL')
                    .setRequired(false))
                .addStringOption(opt => opt
                    .setName('thumbnail')
                    .setDescription('Thumbnail URL')
                    .setRequired(false))
                .addChannelOption(opt => opt
                    .setName('channel')
                    .setDescription('Channel to send to (default: current)')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('reply')
                .setDescription('Reply to a specific message')
                .addStringOption(opt => opt
                    .setName('message_id')
                    .setDescription('ID of message to reply to')
                    .setRequired(true))
                .addStringOption(opt => opt
                    .setName('text')
                    .setDescription('Reply text')
                    .setRequired(true))
                .addChannelOption(opt => opt
                    .setName('channel')
                    .setDescription('Channel where the message is (default: current)')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(false))
        ),

    permission: PermissionLevels.ADMIN,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'text':
                await handleText(interaction);
                break;
            case 'embed':
                await handleEmbed(interaction);
                break;
            case 'reply':
                await handleReply(interaction);
                break;
        }
    }
};

async function handleText(interaction) {
    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        await channel.send(message);

        await interaction.reply({
            embeds: [{
                color: config.settings.successColor,
                description: `✅ Message sent to ${channel}`,
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                }
            }],
            ephemeral: true
        });
    } catch (error) {
        await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: `❌ Failed to send message: ${error.message}`
            }],
            ephemeral: true
        });
    }
}

async function handleEmbed(interaction) {
    const description = interaction.options.getString('description');
    const title = interaction.options.getString('title');
    const colorHex = interaction.options.getString('color');
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        const embed = new EmbedBuilder()
            .setDescription(description);

        if (title) embed.setTitle(title);

        // Parse color
        if (colorHex) {
            const cleanHex = colorHex.replace(/^#/, '');
            const color = parseInt(cleanHex, 16);
            if (!isNaN(color) && color <= 0xFFFFFF) {
                embed.setColor(color);
            } else {
                embed.setColor(config.settings.defaultColor);
            }
        } else {
            embed.setColor(config.settings.defaultColor);
        }

        if (image) embed.setImage(image);
        if (thumbnail) embed.setThumbnail(thumbnail);

        embed.setFooter({
            text: config.settings.embedFooter,
            icon_url: config.settings.embedFooterIcon
        });
        embed.setTimestamp();

        await channel.send({ embeds: [embed] });

        await interaction.reply({
            embeds: [{
                color: config.settings.successColor,
                description: `✅ Embed sent to ${channel}`,
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                }
            }],
            ephemeral: true
        });
    } catch (error) {
        await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: `❌ Failed to send embed: ${error.message}`
            }],
            ephemeral: true
        });
    }
}

async function handleReply(interaction) {
    const messageId = interaction.options.getString('message_id');
    const text = interaction.options.getString('text');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        const targetMessage = await channel.messages.fetch(messageId);
        await targetMessage.reply(text);

        await interaction.reply({
            embeds: [{
                color: config.settings.successColor,
                description: `✅ Reply sent in ${channel}`,
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                }
            }],
            ephemeral: true
        });
    } catch (error) {
        await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: `❌ Failed to send reply: ${error.message}`
            }],
            ephemeral: true
        });
    }
}