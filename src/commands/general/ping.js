// src/commands/general/ping.js

import { SlashCommandBuilder } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { config } from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and response time'),

    permission: PermissionLevels.EVERYONE,
    prefixAlias: 'ping',

    async execute(interaction, client) {
        const sent = await interaction.reply({ 
            content: '🏓 Pinging...', 
            fetchReply: true 
        });

        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        await interaction.editReply({
            content: null,
            embeds: [{
                color: config.settings.defaultColor,
                title: '🏓 Pong!',
                fields: [
                    { name: '📡 Bot Latency', value: `\`${latency}ms\``, inline: true },
                    { name: '💓 API Latency', value: `\`${apiLatency}ms\``, inline: true },
                    { name: '⏱️ Uptime', value: `\`${formatUptime(client.stats.startTime)}\``, inline: true }
                ],
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                },
                timestamp: new Date()
            }]
        });
    },

    async executePrefix(message, args, client) {
        const sent = await message.reply('🏓 Pinging...');
        
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        await sent.edit({
            content: null,
            embeds: [{
                color: config.settings.defaultColor,
                title: '🏓 Pong!',
                fields: [
                    { name: '📡 Bot Latency', value: `\`${latency}ms\``, inline: true },
                    { name: '💓 API Latency', value: `\`${apiLatency}ms\``, inline: true },
                    { name: '⏱️ Uptime', value: `\`${formatUptime(client.stats.startTime)}\``, inline: true }
                ],
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                },
                timestamp: new Date()
            }]
        });
    }
};

function formatUptime(startTime) {
    const uptime = Date.now() - startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}