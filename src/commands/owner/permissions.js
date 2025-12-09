import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { PermissionLevels, getPermissionLevelName, parsePermissionLevel, getUserPermissionLevel } from '../../utils/permissions.js';
import { db } from '../../utils/database.js';
import { config } from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('permissions')
        .setDescription('Manage bot permissions (Owner only)')
        .addSubcommand(sub =>
            sub.setName('user')
                .setDescription('Set permission level for a user')
                .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
                .addStringOption(opt => opt.setName('level').setDescription('Permission level').setRequired(true)
                    .addChoices(
                        { name: 'Everyone', value: 'everyone' },
                        { name: 'Member', value: 'member' },
                        { name: 'VIP', value: 'vip' },
                        { name: 'Helper', value: 'helper' },
                        { name: 'Moderator', value: 'moderator' },
                        { name: 'Admin', value: 'admin' }
                    ))
        )
        .addSubcommand(sub =>
            sub.setName('role')
                .setDescription('Set permission level for a role')
                .addRoleOption(opt => opt.setName('role').setDescription('Target role').setRequired(true))
                .addStringOption(opt => opt.setName('level').setDescription('Permission level').setRequired(true)
                    .addChoices(
                        { name: 'Everyone', value: 'everyone' },
                        { name: 'Member', value: 'member' },
                        { name: 'VIP', value: 'vip' },
                        { name: 'Helper', value: 'helper' },
                        { name: 'Moderator', value: 'moderator' },
                        { name: 'Admin', value: 'admin' }
                    ))
        )
        .addSubcommand(sub =>
            sub.setName('command')
                .setDescription('Set required permission level for a command')
                .addStringOption(opt => opt.setName('command').setDescription('Command name').setRequired(true))
                .addStringOption(opt => opt.setName('level').setDescription('Permission level').setRequired(true)
                    .addChoices(
                        { name: 'Everyone', value: 'everyone' },
                        { name: 'Member', value: 'member' },
                        { name: 'VIP', value: 'vip' },
                        { name: 'Helper', value: 'helper' },
                        { name: 'Moderator', value: 'moderator' },
                        { name: 'Admin', value: 'admin' },
                        { name: 'Owner', value: 'owner' }
                    ))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove custom permission')
                .addStringOption(opt => opt.setName('type').setDescription('Type').setRequired(true)
                    .addChoices(
                        { name: 'User', value: 'user' },
                        { name: 'Role', value: 'role' },
                        { name: 'Command', value: 'command' }
                    ))
                .addStringOption(opt => opt.setName('id').setDescription('User ID / Role ID / Command name').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all custom permissions')
        )
        .addSubcommand(sub =>
            sub.setName('check')
                .setDescription('Check permission level of a user')
                .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        ),

    permission: PermissionLevels.OWNER,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'user':
                await handleUserPermission(interaction);
                break;
            case 'role':
                await handleRolePermission(interaction);
                break;
            case 'command':
                await handleCommandPermission(interaction, client);
                break;
            case 'remove':
                await handleRemovePermission(interaction);
                break;
            case 'list':
                await handleListPermissions(interaction);
                break;
            case 'check':
                await handleCheckPermission(interaction);
                break;
        }
    }
};

async function handleUserPermission(interaction) {
    const user = interaction.options.getUser('user');
    const levelStr = interaction.options.getString('level');
    const level = parsePermissionLevel(levelStr);

    db.setUserPermission(user.id, level);

    await interaction.reply({
        embeds: [{
            color: config.settings.successColor,
            title: '✅ User Permission Updated',
            description: `**${user.tag}** now has **${getPermissionLevelName(level)}** permission level`,
            fields: [
                { name: 'User', value: `<@${user.id}>`, inline: true },
                { name: 'Level', value: getPermissionLevelName(level), inline: true }
            ],
            footer: {
                text: config.settings.embedFooter,
                icon_url: config.settings.embedFooterIcon
            },
            timestamp: new Date()
        }],
        ephemeral: true
    });
}

async function handleRolePermission(interaction) {
    const role = interaction.options.getRole('role');
    const levelStr = interaction.options.getString('level');
    const level = parsePermissionLevel(levelStr);

    db.setRolePermission(role.id, level);

    await interaction.reply({
        embeds: [{
            color: config.settings.successColor,
            title: '✅ Role Permission Updated',
            description: `Role **${role.name}** now has **${getPermissionLevelName(level)}** permission level`,
            fields: [
                { name: 'Role', value: `<@&${role.id}>`, inline: true },
                { name: 'Level', value: getPermissionLevelName(level), inline: true }
            ],
            footer: {
                text: config.settings.embedFooter,
                icon_url: config.settings.embedFooterIcon
            },
            timestamp: new Date()
        }],
        ephemeral: true
    });
}

async function handleCommandPermission(interaction, client) {
    const commandName = interaction.options.getString('command');
    const levelStr = interaction.options.getString('level');
    const level = parsePermissionLevel(levelStr);

    // Check if command exists (slash or prefix)
    const slashCommand = client.commands.get(commandName);
    const prefixCommand = client.prefixCommands.get(commandName);
    
    if (!slashCommand && !prefixCommand) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: `❌ Command **${commandName}** not found`
            }],
            ephemeral: true
        });
    }

    db.setCommandPermission(commandName, level);

    const commandType = slashCommand ? 'slash' : 'prefix';

    await interaction.reply({
        embeds: [{
            color: config.settings.successColor,
            title: '✅ Command Permission Updated',
            description: `Command **${commandType === 'slash' ? '/' : config.settings.prefix}${commandName}** now requires **${getPermissionLevelName(level)}** permission`,
            fields: [
                { name: 'Command', value: `\`${commandType === 'slash' ? '/' : config.settings.prefix}${commandName}\``, inline: true },
                { name: 'Type', value: commandType, inline: true },
                { name: 'Required Level', value: getPermissionLevelName(level), inline: true }
            ],
            footer: {
                text: config.settings.embedFooter,
                icon_url: config.settings.embedFooterIcon
            },
            timestamp: new Date()
        }],
        ephemeral: true
    });
}

async function handleRemovePermission(interaction) {
    const type = interaction.options.getString('type');
    const id = interaction.options.getString('id');

    let success = false;
    let message = '';

    switch (type) {
        case 'user':
            success = db.removeUserPermission(id);
            message = `Custom permission removed for user <@${id}>`;
            break;
        case 'role':
            success = db.removeRolePermission(id);
            message = `Custom permission removed for role <@&${id}>`;
            break;
        case 'command':
            success = db.removeCommandPermission(id);
            message = `Custom permission removed for command \`/${id}\``;
            break;
    }

    await interaction.reply({
        embeds: [{
            color: success ? config.settings.successColor : config.settings.errorColor,
            description: success ? `✅ ${message}` : `❌ Failed to remove permission`
        }],
        ephemeral: true
    });
}

async function handleListPermissions(interaction) {
    const userPerms = db.getAllUserPermissions();
    const rolePerms = db.getAllRolePermissions();
    const cmdPerms = db.getAllCommandPermissions();

    const fields = [];

    // User permissions
    if (Object.keys(userPerms).length > 0) {
        const userList = Object.entries(userPerms)
            .map(([id, level]) => `<@${id}> → **${getPermissionLevelName(level)}**`)
            .join('\n') || 'None';
        fields.push({ name: '👤 User Permissions', value: userList, inline: false });
    }

    // Role permissions
    if (Object.keys(rolePerms).length > 0) {
        const roleList = Object.entries(rolePerms)
            .map(([id, level]) => `<@&${id}> → **${getPermissionLevelName(level)}**`)
            .join('\n') || 'None';
        fields.push({ name: '🎭 Role Permissions', value: roleList, inline: false });
    }

    // Command permissions
    if (Object.keys(cmdPerms).length > 0) {
        const cmdList = Object.entries(cmdPerms)
            .map(([cmd, level]) => {
                const isSlash = client.commands.has(cmd);
                const isPrefix = client.prefixCommands.has(cmd);
                const symbol = isSlash ? '/' : config.settings.prefix;
                const type = isSlash ? '(slash)' : '(prefix)';
                return `\`${symbol}${cmd}\` ${type} → **${getPermissionLevelName(level)}**`;
            })
            .join('\n') || 'None';
        fields.push({ name: '⚙️ Command Permissions', value: cmdList, inline: false });
    }

    if (fields.length === 0) {
        fields.push({ name: 'No Custom Permissions', value: 'All permissions are using default config values' });
    }

    await interaction.reply({
        embeds: [{
            color: config.settings.defaultColor,
            title: '📋 Custom Permissions List',
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

async function handleCheckPermission(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    const level = getUserPermissionLevel(member);

    const customUserPerm = db.getUserPermission(user.id);
    const rolePerms = [];
    
    for (const [roleId, permLevel] of Object.entries(db.getAllRolePermissions())) {
        if (member.roles.cache.has(roleId)) {
            const role = interaction.guild.roles.cache.get(roleId);
            rolePerms.push(`<@&${roleId}> → **${getPermissionLevelName(permLevel)}**`);
        }
    }

    const fields = [
        { name: '🎯 Current Level', value: `**${getPermissionLevelName(level)}**`, inline: true },
        { name: '👤 User ID', value: user.id, inline: true }
    ];

    if (customUserPerm !== null) {
        fields.push({
            name: '⚙️ Custom User Permission',
            value: `**${getPermissionLevelName(customUserPerm)}**`,
            inline: false
        });
    }

    if (rolePerms.length > 0) {
        fields.push({
            name: '🎭 Role Permissions',
            value: rolePerms.join('\n'),
            inline: false
        });
    }

    await interaction.reply({
        embeds: [{
            color: config.settings.defaultColor,
            title: '🔍 Permission Check',
            description: `Checking permissions for **${user.tag}**`,
            fields,
            thumbnail: { url: user.displayAvatarURL() },
            footer: {
                text: config.settings.embedFooter,
                icon_url: config.settings.embedFooterIcon
            },
            timestamp: new Date()
        }],
        ephemeral: true
    });
}