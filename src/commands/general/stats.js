import { SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { config } from '../../config/config.js';
import os from 'os';

export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View detailed bot statistics'),

    permission: PermissionLevels.HELPER,
    prefixAlias: 'stats',

    async execute(interaction, client) {
        await sendStats(interaction, client);
    },

    async executePrefix(message, args, client) {
        await sendStats(message, client);
    }
};

async function sendStats(context, client) {
    const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const memoryPercent = ((process.memoryUsage().heapUsed / os.totalmem()) * 100).toFixed(2);

    const embed = {
        color: config.settings.defaultColor,
        title: '📊 Bot Statistics',
        fields: [
            {
                name: '🤖 Bot Stats',
                value: [
                    `**Servers:** ${client.guilds.cache.size}`,
                    `**Users:** ${client.users.cache.size}`,
                    `**Channels:** ${client.channels.cache.size}`,
                    `**Commands Executed:** ${client.stats.commandsExecuted}`,
                    `**Errors:** ${client.stats.errors}`
                ].join('\n'),
                inline: true
            },
            {
                name: '⚙️ System',
                value: [
                    `**Platform:** ${os.platform()}`,
                    `**CPU:** ${os.cpus()[0].model}`,
                    `**Cores:** ${os.cpus().length}`,
                    `**Memory:** ${usedMemory}MB / ${totalMemory}GB (${memoryPercent}%)`,
                    `**Node.js:** ${process.version}`
                ].join('\n'),
                inline: true
            },
            {
                name: '📦 Bot Info',
                value: [
                    `**Version:** ${config.about.version}`,
                    `**Discord.js:** v${djsVersion}`,
                    `**Uptime:** ${formatUptime(client.stats.startTime)}`,
                    `**Ping:** ${Math.round(client.ws.ping)}ms`
                ].join('\n'),
                inline: false
            }
        ],
        thumbnail: { url: config.settings.embedThumbnail },
        footer: {
            text: config.settings.embedFooter,
            icon_url: config.settings.embedFooterIcon
        },
        timestamp: new Date()
    };

    if (context.reply) {
        await context.reply({ embeds: [embed] });
    } else {
        await context.editReply({ embeds: [embed] });
    }
}

function formatUptime(startTime) {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}