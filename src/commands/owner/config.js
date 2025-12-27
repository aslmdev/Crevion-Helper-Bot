// src/commands/owner/config.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { getConfig, updateConfig } from '../../models/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Manage bot configuration')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current bot configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-prefix')
                .setDescription('Change bot prefix')
                .addStringOption(option =>
                    option
                        .setName('prefix')
                        .setDescription('New prefix (e.g., !, ?, -)')
                        .setRequired(true)
                        .setMaxLength(5)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-status')
                .setDescription('Change bot status')
                .addStringOption(option =>
                    option
                        .setName('status')
                        .setDescription('Bot status')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 Online', value: 'online' },
                            { name: '🟡 Idle', value: 'idle' },
                            { name: '🔴 Do Not Disturb', value: 'dnd' },
                            { name: '⚫ Invisible', value: 'invisible' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-owner')
                .setDescription('Add a new bot owner')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to make owner')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-owner')
                .setDescription('Remove a bot owner')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Owner to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reload')
                .setDescription('Reload config from database')
        ),

    permission: PermissionLevels.OWNER,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'view') {
            await handleView(interaction);
        } else if (subcommand === 'set-prefix') {
            await handleSetPrefix(interaction, client);
        } else if (subcommand === 'set-status') {
            await handleSetStatus(interaction, client);
        } else if (subcommand === 'add-owner') {
            await handleAddOwner(interaction);
        } else if (subcommand === 'remove-owner') {
            await handleRemoveOwner(interaction);
        } else if (subcommand === 'reload') {
            await handleReload(interaction, client);
        }
    }
};

// View current config
async function handleView(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const dbConfig = await getConfig();

        if (!dbConfig) {
            return await interaction.editReply({
                embeds: [{
                    color: 0xED4245,
                    title: '❌ Error',
                    description: 'Could not load configuration from database.',
                    footer: { text: 'Crévion' }
                }]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x370080)
            .setTitle('⚙️ Bot Configuration')
            .setDescription('Current configuration loaded from database')
            .addFields(
                {
                    name: '🤖 Bot Info',
                    value: [
                        `**Name:** ${dbConfig.botName || 'Not Set'}`,
                        `**Version:** ${dbConfig.version || 'Unknown'}`,
                        `**Prefix:** \`${dbConfig.prefix || '-'}\``,
                        `**Status:** ${dbConfig.status || 'idle'}`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🌐 Server',
                    value: [
                        `**Guild ID:** ${dbConfig.guildId || 'Not Set'}`,
                        `**Guild Name:** ${dbConfig.guildName || 'Not Set'}`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '👥 Permissions',
                    value: [
                        `**Owners:** ${dbConfig.permissions?.owners?.length || 0}`,
                        `**Admin Roles:** ${dbConfig.permissions?.roles?.admin?.length || 0}`,
                        `**Mod Roles:** ${dbConfig.permissions?.roles?.moderator?.length || 0}`,
                        `**Helper Roles:** ${dbConfig.permissions?.roles?.helper?.length || 0}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📊 Statistics',
                    value: [
                        `**Total Commands:** ${dbConfig.stats?.totalCommands || 0}`,
                        `**Total Errors:** ${dbConfig.stats?.totalErrors || 0}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🎨 Features',
                    value: [
                        `${dbConfig.features?.problemSolving ? '✅' : '❌'} Daily Challenges`,
                        `${dbConfig.features?.aiAssistant ? '✅' : '❌'} AI Assistant`,
                        `${dbConfig.features?.commandLogging ? '✅' : '❌'} Command Logging`
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: 'Config from crevion_db' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('❌ Error viewing config:', error);
        await interaction.editReply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to load configuration.',
                footer: { text: 'Crévion' }
            }]
        }).catch(() => {});
    }
}

// Set prefix
async function handleSetPrefix(interaction, client) {
    try {
        const newPrefix = interaction.options.getString('prefix');
        const oldPrefix = client.dbConfig?.prefix || '-';

        // Update in database
        await updateConfig({ prefix: newPrefix });

        // Update in client
        client.dbConfig = await getConfig();

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Prefix Updated')
            .setDescription('Bot prefix has been changed successfully!')
            .addFields(
                { name: '📝 Old Prefix', value: `\`${oldPrefix}\``, inline: true },
                { name: '📝 New Prefix', value: `\`${newPrefix}\``, inline: true },
                { name: '💡 Usage', value: `You can now use: \`${newPrefix}help\``, inline: false }
            )
            .setFooter({ text: 'Changes saved to crevion_db' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        console.log(`⚙️ Prefix changed from "${oldPrefix}" to "${newPrefix}" by ${interaction.user.tag}`);

    } catch (error) {
        console.error('❌ Error setting prefix:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to update prefix in database.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        });
    }
}

// Set status (with persistent update)
async function handleSetStatus(interaction, client) {
    try {
        const newStatus = interaction.options.getString('status');
        
        // Update in database FIRST
        await updateConfig({ status: newStatus });

        // Stop any existing status rotation
        if (client.statusRotation) {
            clearInterval(client.statusRotation);
            client.statusRotation = null;
        }

        // Set the new status immediately
        await client.user.setPresence({ 
            status: newStatus,
            activities: client.user.presence.activities
        });

        // Update in client config
        client.dbConfig = await getConfig();

        const statusEmojis = {
            online: '🟢',
            idle: '🟡',
            dnd: '🔴',
            invisible: '⚫'
        };

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Status Updated Permanently')
            .setDescription('Bot status has been changed and saved to database!')
            .addFields(
                { name: '📊 New Status', value: `${statusEmojis[newStatus]} ${newStatus.toUpperCase()}`, inline: true },
                { name: '💾 Persistence', value: 'Will remain after restart', inline: true },
                { name: '👤 Updated By', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Changes saved to crevion_db' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        console.log(`⚙️ Status changed to "${newStatus}" permanently by ${interaction.user.tag}`);

    } catch (error) {
        console.error('❌ Error setting status:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to update status.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        });
    }
}

// Add owner
async function handleAddOwner(interaction) {
    try {
        const user = interaction.options.getUser('user');
        const dbConfig = await getConfig();

        // Check if already owner
        if (dbConfig.permissions?.owners?.includes(user.id)) {
            return await interaction.reply({
                embeds: [{
                    color: 0xFEE75C,
                    title: '⚠️ Already Owner',
                    description: `${user} is already a bot owner.`,
                    footer: { text: 'Crévion' }
                }],
                ephemeral: true
            });
        }

        // Add to database
        await updateConfig({
            'permissions.owners': [...(dbConfig.permissions?.owners || []), user.id]
        });

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Owner Added')
            .setDescription(`${user} has been added as a bot owner!`)
            .addFields(
                { name: '👤 User', value: `${user.tag} (${user.id})`, inline: false },
                { name: '🔑 Permissions', value: 'Full access to all bot commands', inline: false }
            )
            .setFooter({ text: 'Changes saved to crevion_db' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        console.log(`⚙️ Owner added: ${user.tag} by ${interaction.user.tag}`);

    } catch (error) {
        console.error('❌ Error adding owner:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to add owner.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        });
    }
}

// Remove owner
async function handleRemoveOwner(interaction) {
    try {
        const user = interaction.options.getUser('user');
        const dbConfig = await getConfig();

        // Check if is owner
        if (!dbConfig.permissions?.owners?.includes(user.id)) {
            return await interaction.reply({
                embeds: [{
                    color: 0xFEE75C,
                    title: '⚠️ Not an Owner',
                    description: `${user} is not a bot owner.`,
                    footer: { text: 'Crévion' }
                }],
                ephemeral: true
            });
        }

        // Prevent removing self if last owner
        const owners = dbConfig.permissions?.owners || [];
        if (owners.length === 1 && user.id === interaction.user.id) {
            return await interaction.reply({
                embeds: [{
                    color: 0xED4245,
                    title: '❌ Cannot Remove',
                    description: 'Cannot remove the last owner. Add another owner first.',
                    footer: { text: 'Crévion' }
                }],
                ephemeral: true
            });
        }

        // Remove from database
        const newOwners = owners.filter(id => id !== user.id);
        await updateConfig({
            'permissions.owners': newOwners
        });

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Owner Removed')
            .setDescription(`${user} has been removed from bot owners.`)
            .addFields(
                { name: '👤 User', value: `${user.tag} (${user.id})`, inline: false }
            )
            .setFooter({ text: 'Changes saved to crevion_db' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        console.log(`⚙️ Owner removed: ${user.tag} by ${interaction.user.tag}`);

    } catch (error) {
        console.error('❌ Error removing owner:', error);
        await interaction.reply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to remove owner.',
                footer: { text: 'Crévion' }
            }],
            ephemeral: true
        });
    }
}

// Reload config
async function handleReload(interaction, client) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // Reload from database
        client.dbConfig = await getConfig();

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Config Reloaded')
            .setDescription('Configuration has been reloaded from database.')
            .addFields(
                { name: '📝 Prefix', value: `\`${client.dbConfig?.prefix || '-'}\``, inline: true },
                { name: '📊 Status', value: client.dbConfig?.status || 'idle', inline: true },
                { name: '👥 Owners', value: `${client.dbConfig?.permissions?.owners?.length || 0}`, inline: true }
            )
            .setFooter({ text: 'Loaded from crevion_db' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        console.log(`⚙️ Config reloaded by ${interaction.user.tag}`);

    } catch (error) {
        console.error('❌ Error reloading config:', error);
        await interaction.editReply({
            embeds: [{
                color: 0xED4245,
                title: '❌ Error',
                description: 'Failed to reload configuration.',
                footer: { text: 'Crévion' }
            }]
        }).catch(() => {});
    }
}