import { SlashCommandBuilder } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { lineManager } from '../../utils/lineManager.js';
import { config } from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('line')
        .setDescription('Manage line image system (Owner only)')
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set the line image URL')
                .addStringOption(opt => opt
                    .setName('url')
                    .setDescription('Image URL (must end with .png, .jpg, etc.)')
                    .setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('roles')
                .setDescription('Manage roles that can use line commands')
                .addStringOption(opt => opt
                    .setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Add Role', value: 'add' },
                        { name: 'Remove Role', value: 'remove' },
                        { name: 'List Roles', value: 'list' }
                    ))
                .addRoleOption(opt => opt
                    .setName('role')
                    .setDescription('The role')
                    .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('View current line configuration')
        ),

    permission: PermissionLevels.OWNER, // Owner only for all line commands

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'set':
                await handleSet(interaction, client);
                break;
            case 'roles':
                await handleRoles(interaction);
                break;
            case 'info':
                await handleInfo(interaction);
                break;
        }
    }
};

async function handleSet(interaction, client) {
    const url = interaction.options.getString('url');

    // Validate URL
    if (!url.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                title: '❌ Invalid URL',
                description: 'Please provide a valid image URL ending with `.png`, `.jpg`, `.jpeg`, or `.gif`',
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                }
            }],
            ephemeral: true
        });
    }

    // Save URL
    lineManager.setUrl(url, interaction.user.id);
    client.lineUrl = url; // Update client cache

    await interaction.reply({
        embeds: [{
            color: config.settings.successColor,
            title: '✅ Line Image Updated',
            description: 'The line image has been successfully updated and saved',
            thumbnail: { url: url },
            fields: [
                {
                    name: '🔗 Image URL',
                    value: `[Click to View](${url})`,
                    inline: false
                },
                {
                    name: '📝 Note',
                    value: 'Only users with configured roles can trigger the line using "خط" or "line" commands',
                    inline: false
                }
            ],
            footer: {
                text: `Updated by ${interaction.user.tag}`,
                icon_url: interaction.user.displayAvatarURL()
            },
            timestamp: new Date()
        }],
        ephemeral: true
    });
}

async function handleRoles(interaction) {
    const action = interaction.options.getString('action');
    const role = interaction.options.getRole('role');

    if (action === 'list') {
        const roles = lineManager.getAllowedRoles();
        
        if (roles.length === 0) {
            return await interaction.reply({
                embeds: [{
                    color: config.settings.warningColor,
                    description: '⚠️ No roles configured. Add roles to allow members to use line commands.'
                }],
                ephemeral: true
            });
        }

        const rolesList = roles.map(id => `<@&${id}>`).join('\n');

        return await interaction.reply({
            embeds: [{
                color: config.settings.defaultColor,
                title: '🎭 Line Permission Roles',
                description: `Members with these roles can use **"خط"** and **"line"** commands:\n\n${rolesList}`,
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                },
                timestamp: new Date()
            }],
            ephemeral: true
        });
    }

    if (!role) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: '❌ Please provide a role'
            }],
            ephemeral: true
        });
    }

    if (action === 'add') {
        const success = lineManager.addRole(role.id);
        
        if (success) {
            await interaction.reply({
                embeds: [{
                    color: config.settings.successColor,
                    title: '✅ Role Added',
                    description: `Members with ${role} can now use line commands`,
                    footer: {
                        text: config.settings.embedFooter,
                        icon_url: config.settings.embedFooterIcon
                    }
                }],
                ephemeral: true
            });
        } else {
            await interaction.reply({
                embeds: [{
                    color: config.settings.warningColor,
                    description: `⚠️ ${role} is already in the list`
                }],
                ephemeral: true
            });
        }
    }

    if (action === 'remove') {
        const success = lineManager.removeRole(role.id);
        
        if (success) {
            await interaction.reply({
                embeds: [{
                    color: config.settings.successColor,
                    description: `✅ Removed ${role} from line permissions`
                }],
                ephemeral: true
            });
        } else {
            await interaction.reply({
                embeds: [{
                    color: config.settings.errorColor,
                    description: `❌ ${role} is not in the list`
                }],
                ephemeral: true
            });
        }
    }
}

async function handleInfo(interaction) {
    const lineConfig = lineManager.getConfig();
    const roles = lineManager.getAllowedRoles();

    const fields = [];

    if (lineConfig.url) {
        fields.push({
            name: '🖼️ Current Line Image',
            value: `[View Image](${lineConfig.url})`,
            inline: false
        });
    } else {
        fields.push({
            name: '🖼️ Current Line Image',
            value: 'Not set',
            inline: false
        });
    }

    if (roles.length > 0) {
        fields.push({
            name: '🎭 Allowed Roles',
            value: roles.map(id => `<@&${id}>`).join(', '),
            inline: false
        });
    } else {
        fields.push({
            name: '🎭 Allowed Roles',
            value: 'No roles configured',
            inline: false
        });
    }

    if (lineConfig.lastUpdated) {
        fields.push({
            name: 'ℹ️ Last Updated',
            value: `<t:${Math.floor(lineConfig.lastUpdated / 1000)}:R> by <@${lineConfig.updatedBy}>`,
            inline: false
        });
    }

    await interaction.reply({
        embeds: [{
            color: config.settings.defaultColor,
            title: '📋 Line Configuration',
            fields,
            thumbnail: lineConfig.url ? { url: lineConfig.url } : undefined,
            footer: {
                text: config.settings.embedFooter,
                icon_url: config.settings.embedFooterIcon
            },
            timestamp: new Date()
        }],
        ephemeral: true
    });
}