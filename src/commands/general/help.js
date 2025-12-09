import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../../config/config.js';
import { PermissionLevels, getPermissionLevelName, getUserPermissionLevel, getCommandRequiredLevel } from '../../utils/permissions.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display command list and help information')
        .addStringOption(option =>
            option
                .setName('command')
                .setDescription('Command name for detailed information')
                .setRequired(false)
        ),

    permission: PermissionLevels.EVERYONE,
    prefixAlias: 'help',

    async execute(interaction, client) {
        const commandName = interaction.options?.getString('command');
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const userLevel = getUserPermissionLevel(member);

        if (commandName) {
            return await showCommandDetails(interaction, client, commandName, userLevel);
        }

        await showMainHelp(interaction, client, userLevel);
    },

    async executePrefix(message, args, client) {
        const commandName = args[0];
        const member = await message.guild.members.fetch(message.author.id);
        const userLevel = getUserPermissionLevel(member);

        if (commandName) {
            const command = client.commands.get(commandName) || client.prefixCommands.get(commandName);
            
            if (!command) {
                return await message.reply({
                    embeds: [{
                        color: config.settings.errorColor,
                        description: `❌ Command **${commandName}** not found`
                    }]
                });
            }

            const embed = createCommandDetailEmbed(command, userLevel);
            return await message.reply({ embeds: [embed] });
        }

        const embed = createMainHelpEmbed(client, userLevel);
        const components = createHelpComponents(client, userLevel);
        
        await message.reply({ embeds: [embed], components });
    }
};

// Main help display
async function showMainHelp(interaction, client, userLevel) {
    const embed = createMainHelpEmbed(client, userLevel);
    const components = createHelpComponents(client, userLevel);

    await interaction.reply({
        embeds: [embed],
        components,
        ephemeral: false
    });
}

// Create main help embed
function createMainHelpEmbed(client, userLevel) {
    const categories = getCommandsByCategory(client, userLevel);
    
    const fields = [];
    
    for (const [category, commands] of Object.entries(categories)) {
        if (commands.length === 0) continue;
        
        const commandsList = commands.map(cmd => `\`${cmd.data.name}\``).join(' • ');
        
        fields.push({
            name: `${getCategoryEmoji(category)} ${getCategoryName(category)}`,
            value: commandsList || 'No commands available',
            inline: false
        });
    }

    return {
        color: config.settings.defaultColor,
        author: {
            name: `${config.about.name} - Command List`,
            icon_url: config.settings.embedThumbnail
        },
        description: `**${config.about.tagline}**\n\n${config.about.description}\n\n**Your Permission Level:** ${getPermissionLevelName(userLevel)}\n**Prefix:** \`${config.settings.prefix}\` or \`/\` (slash commands)`,
        fields,
        thumbnail: { url: config.settings.embedThumbnail },
        footer: {
            text: `${config.settings.embedFooter} | Use /help [command] for more details`,
            icon_url: config.settings.embedFooterIcon
        },
        timestamp: new Date()
    };
}

// Create help components
function createHelpComponents(client, userLevel) {
    const categories = getCommandsByCategory(client, userLevel);
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder('🔍 Select a category to view commands')
        .addOptions(
            Object.keys(categories).filter(cat => categories[cat].length > 0).map(cat => ({
                label: getCategoryName(cat),
                description: `View ${getCategoryName(cat)} commands`,
                value: cat,
                emoji: getCategoryEmoji(cat)
            }))
        );

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
                .setEmoji('💬'),
            new ButtonBuilder()
                .setLabel('Bot Info')
                .setCustomId('bot_info')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('ℹ️')
        );

    return [
        new ActionRowBuilder().addComponents(selectMenu),
        buttons
    ];
}

// Show command details
async function showCommandDetails(interaction, client, commandName, userLevel) {
    const command = client.commands.get(commandName);
    
    if (!command) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: `❌ Command **${commandName}** not found`
            }],
            ephemeral: true
        });
    }

    const embed = createCommandDetailEmbed(command, userLevel);
    await interaction.reply({ embeds: [embed], ephemeral: false });
}

// Create command detail embed
function createCommandDetailEmbed(command, userLevel) {
    const requiredLevel = getCommandRequiredLevel(command.data.name, command.permission || PermissionLevels.EVERYONE);
    const hasAccess = userLevel >= requiredLevel;

    const fields = [
        {
            name: '📝 Description',
            value: command.data.description || 'No description available',
            inline: false
        }
    ];

    // Required permissions
    fields.push({
        name: '🔐 Required Permission',
        value: `${getPermissionLevelName(requiredLevel)} ${hasAccess ? '✅' : '❌'}`,
        inline: true
    });

    fields.push({
        name: '📂 Category',
        value: getCategoryFromPermission(requiredLevel),
        inline: true
    });

    // Usage
    let usage = `\`/${command.data.name}`;
    if (command.data.options && command.data.options.length > 0) {
        const options = command.data.options.map(opt => 
            opt.required ? `<${opt.name}>` : `[${opt.name}]`
        ).join(' ');
        usage += ` ${options}`;
    }
    usage += '`';

    if (command.prefixAlias) {
        usage += `\nPrefix: \`${config.settings.prefix}${command.prefixAlias}\``;
    }

    fields.push({
        name: '💬 Usage',
        value: usage,
        inline: false
    });

    // Options/Parameters
    if (command.data.options && command.data.options.length > 0) {
        const optionsText = command.data.options.map(opt => {
            const required = opt.required ? '**[Required]**' : '*[Optional]*';
            return `• **${opt.name}** ${required}\n  └ ${opt.description}`;
        }).join('\n\n');

        fields.push({
            name: '⚙️ Parameters',
            value: optionsText,
            inline: false
        });
    }

    // Examples
    const examples = getCommandExamples(command.data.name);
    if (examples) {
        fields.push({
            name: '💡 Examples',
            value: examples,
            inline: false
        });
    }

    return {
        color: hasAccess ? config.settings.defaultColor : config.settings.errorColor,
        title: `📌 Command Info: ${command.data.name}`,
        fields,
        thumbnail: { url: config.settings.embedThumbnail },
        footer: {
            text: config.settings.embedFooter,
            icon_url: config.settings.embedFooterIcon
        },
        timestamp: new Date()
    };
}

// Categorize commands
function getCommandsByCategory(client, userLevel) {
    const categories = {
        general: [],
        moderation: [],
        creator: [],
        owner: []
    };

    client.commands.forEach(cmd => {
        const requiredLevel = getCommandRequiredLevel(cmd.data.name, cmd.permission || PermissionLevels.EVERYONE);
        
        // Hide commands user doesn't have permission for
        if (userLevel < requiredLevel) {
            return;
        }

        let category = 'general';
        
        if (requiredLevel >= PermissionLevels.OWNER) {
            category = 'owner';
        } else if (requiredLevel >= PermissionLevels.MODERATOR) {
            category = 'moderation';
        } else if (requiredLevel >= PermissionLevels.HELPER) {
            category = 'creator';
        }

        if (categories[category]) {
            categories[category].push(cmd);
        }
    });

    return categories;
}

// Category emojis
function getCategoryEmoji(category) {
    const emojis = {
        general: '📂',
        moderation: '🛡️',
        creator: '🎨',
        owner: '👑'
    };
    return emojis[category] || '📁';
}

// Category names
function getCategoryName(category) {
    const names = {
        general: 'General Commands',
        moderation: 'Moderation',
        creator: 'Creator Tools',
        owner: 'Owner Only'
    };
    return names[category] || category;
}

// Get category from permission level
function getCategoryFromPermission(level) {
    if (level >= PermissionLevels.OWNER) return 'Owner Only';
    if (level >= PermissionLevels.MODERATOR) return 'Moderation';
    if (level >= PermissionLevels.HELPER) return 'Creator Tools';
    return 'General';
}

// Command examples
function getCommandExamples(commandName) {
    const examples = {
        'help': '`/help` - View all commands\n`/help ping` - View ping command details',
        'ping': '`/ping` - Check bot latency',
        'info': '`/info` - View bot information',
        'stats': '`/stats` - View detailed statistics',
        'line': '`/line url:https://example.com/image.png` - Set font image',
        'permissions': '`/permissions user @user moderator` - Set user permission\n`/permissions command ping admin` - Set command permission'
    };
    return examples[commandName] || null;
}