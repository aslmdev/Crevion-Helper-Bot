// src/commands/general/info.js

import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { config } from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Display information about the bot'),

    permission: PermissionLevels.EVERYONE,
    prefixAlias: 'info',

    async execute(interaction, client) {
        await sendInfo(interaction, client);
    },

    async executePrefix(message, args, client) {
        await sendInfo(message, client);
    }
};

async function sendInfo(context, client) {
    const embed = {
        color: config.settings.defaultColor,
        author: {
            name: config.about.name,
            icon_url: config.settings.embedThumbnail
        },
        title: `✨ ${config.about.tagline}`,
        description: config.about.description,
        fields: [
            {
                name: '🎯 Features',
                value: config.about.features.join('\n'),
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
                    `**Version:** ${config.about.version}`,
                    `**Developer:** ${config.about.developer}`,
                    `**Prefix:** \`${config.settings.prefix || '/'}\``
                ].join('\n'),
                inline: true
            }
        ],
        thumbnail: { url: config.settings.embedThumbnail },
        footer: {
            text: config.settings.embedFooter,
            icon_url: config.settings.embedFooterIcon
        },
        timestamp: new Date()
    };

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Website')
                .setStyle(ButtonStyle.Link)
                .setURL(config.about.website)
                .setEmoji('🌐'),
            new ButtonBuilder()
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL(config.about.supportServer)
                .setEmoji('💬')
        );

    if (context.reply) {
        await context.reply({ embeds: [embed], components: [buttons] });
    } else {
        await context.editReply({ embeds: [embed], components: [buttons] });
    }
}

function formatUptime(startTime) {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    return `${days}d ${hours}h ${minutes}m`;
}