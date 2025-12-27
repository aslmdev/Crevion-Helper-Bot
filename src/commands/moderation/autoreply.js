// src/commands/moderation/autoreply.js

import { SlashCommandBuilder } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { autoReply } from '../../utils/autoreply.js';
import { config } from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('autoreply')
        .setDescription('Manage auto reply system (Admin only)')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a new auto reply')
                .addStringOption(opt => opt
                    .setName('trigger')
                    .setDescription('The trigger message')
                    .setRequired(true))
                .addStringOption(opt => opt
                    .setName('response')
                    .setDescription('The bot response')
                    .setRequired(true))
                .addBooleanOption(opt => opt
                    .setName('mention')
                    .setDescription('Mention the user in response')
                    .setRequired(false))
                .addBooleanOption(opt => opt
                    .setName('reply')
                    .setDescription('Reply to the message (default: true)')
                    .setRequired(false))
                .addBooleanOption(opt => opt
                    .setName('exact')
                    .setDescription('Exact match only (default: false)')
                    .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove an auto reply')
                .addStringOption(opt => opt
                    .setName('trigger')
                    .setDescription('The trigger to remove')
                    .setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all auto replies')
        )
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Remove all auto replies')
        ),

    permission: PermissionLevels.ADMIN,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                await handleAdd(interaction);
                break;
            case 'remove':
                await handleRemove(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
            case 'clear':
                await handleClear(interaction);
                break;
        }
    }
};

async function handleAdd(interaction) {
    const trigger = interaction.options.getString('trigger');
    const response = interaction.options.getString('response');
    const mention = interaction.options.getBoolean('mention') || false;
    const reply = interaction.options.getBoolean('reply') !== false;
    const exact = interaction.options.getBoolean('exact') || false;

    const success = autoReply.add(trigger, response, { mention, reply, exact });

    if (success) {
        await interaction.reply({
            embeds: [{
                color: config.settings.successColor,
                title: '✅ Auto Reply Added',
                fields: [
                    { name: '📝 Trigger', value: `\`${trigger}\``, inline: true },
                    { name: '💬 Response', value: response, inline: true },
                    { name: '⚙️ Options', value: [
                        `Mention: ${mention ? '✅' : '❌'}`,
                        `Reply: ${reply ? '✅' : '❌'}`,
                        `Exact Match: ${exact ? '✅' : '❌'}`
                    ].join('\n'), inline: false }
                ],
                footer: {
                    text: `Added by ${interaction.user.tag}`,
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
                description: '❌ Failed to add auto reply'
            }],
            ephemeral: true
        });
    }
}

async function handleRemove(interaction) {
    const trigger = interaction.options.getString('trigger');
    const success = autoReply.remove(trigger);

    if (success) {
        await interaction.reply({
            embeds: [{
                color: config.settings.successColor,
                description: `✅ Removed auto reply for: \`${trigger}\``
            }],
            ephemeral: true
        });
    } else {
        await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: `❌ No auto reply found for: \`${trigger}\``
            }],
            ephemeral: true
        });
    }
}

async function handleList(interaction) {
    const replies = autoReply.getAll();
    const count = autoReply.count();

    if (count === 0) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.warningColor,
                description: '⚠️ No auto replies configured'
            }],
            ephemeral: true
        });
    }

    const fields = Object.entries(replies).map(([trigger, data]) => ({
        name: `📝 ${data.trigger}`,
        value: [
            `**Response:** ${data.response}`,
            `**Options:** ${data.mention ? 'Mention' : ''} ${data.reply ? 'Reply' : ''} ${data.exact ? 'Exact' : 'Contains'}`,
            `**Uses:** ${data.uses}`
        ].join('\n'),
        inline: false
    }));

    // Split into multiple embeds if too many
    const chunkedFields = [];
    for (let i = 0; i < fields.length; i += 10) {
        chunkedFields.push(fields.slice(i, i + 10));
    }

    const embeds = chunkedFields.map((chunk, index) => ({
        color: config.settings.defaultColor,
        title: index === 0 ? '📋 Auto Replies List' : undefined,
        description: index === 0 ? `Total: **${count}** auto replies` : undefined,
        fields: chunk,
        footer: {
            text: `${config.settings.embedFooter} | Page ${index + 1}/${chunkedFields.length}`,
            icon_url: config.settings.embedFooterIcon
        },
        timestamp: index === 0 ? new Date() : undefined
    }));

    await interaction.reply({ embeds: embeds.slice(0, 10), ephemeral: true });
}

async function handleClear(interaction) {
    const count = autoReply.count();
    
    if (count === 0) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.warningColor,
                description: '⚠️ No auto replies to clear'
            }],
            ephemeral: true
        });
    }

    autoReply.clear();

    await interaction.reply({
        embeds: [{
            color: config.settings.successColor,
            title: '✅ Auto Replies Cleared',
            description: `Removed **${count}** auto replies`,
            footer: {
                text: `Cleared by ${interaction.user.tag}`,
                icon_url: interaction.user.displayAvatarURL()
            },
            timestamp: new Date()
        }],
        ephemeral: true
    });
}