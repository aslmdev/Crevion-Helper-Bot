// src/commands/general/help.js

import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getConfig } from '../../models/index.js';
import { PermissionLevels, getPermissionLevelName, getUserPermissionLevel } from '../../utils/permissions.js';

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
        const userLevel = await getUserPermissionLevel(member);

        if (commandName) {
            return await showCommandDetails(interaction, client, commandName, userLevel);
        }

        await showMainHelp(interaction, client, userLevel);
    },

    async executePrefix(message, args, client) {
        const commandName = args[0];
        const member = await message.guild.members.fetch(message.author.id);
        const userLevel = await getUserPermissionLevel(member);

        if (commandName) {
            const command = client.commands.get(commandName);
            
            if (!command) {
                return await message.reply({
                    embeds: [{
                        color: 0xED4245,
                        description: `❌ Command **${commandName}** not found`
                    }],
                    allowedMentions: { repliedUser: false }
                });
            }

            const embed = await createCommandDetailEmbed(command, userLevel);
            return await message.reply({ 
                embeds: [embed],
                allowedMentions: { repliedUser: false }
            });
        }

        const embed = await createMainHelpEmbed(client, userLevel);
        const components = createHelpComponents(client, userLevel);
        
        await message.reply({ 
            embeds: [embed], 
            components,
            allowedMentions: { repliedUser: false }
        });
    }
};

// Main help display
async function showMainHelp(interaction, client, userLevel) {
    const embed = await createMainHelpEmbed(client, userLevel);
    const components = createHelpComponents(client, userLevel);

    await interaction.reply({
        embeds: [embed],
        components,
        ephemeral: false
    });
}

// Create main help embed - FIXED: Shows all categories user can access
async function createMainHelpEmbed(client, userLevel) {
    const dbConfig = await getConfig();
    const categories = getCommandsByCategory(client, userLevel);
    
    const fields = [];
    
    // ✅ FIXED: Show categories hierarchically
    const categoryOrder = ['general', 'creativity', 'moderation', 'admin', 'owner'];
    
    for (const categoryKey of categoryOrder) {
        const commands = categories[categoryKey] || [];
        
        // ✅ FIXED: Check if user has permission for this category
        const categoryMinLevel = getCategoryMinLevel(categoryKey);
        if (userLevel < categoryMinLevel) continue; // Skip if no access
        
        if (commands.length === 0) continue;
        
        const commandsList = commands
            .slice(0, 10)
            .map(cmd => `\`${cmd.data.name}\``)
            .join(' • ');
        
        const categoryName = getCategoryDisplayName(categoryKey);
        const categoryEmoji = getCategoryEmoji(categoryKey);
        
        fields.push({
            name: `${categoryEmoji} ${categoryName}`,
            value: commandsList + (commands.length > 10 ? ` • **+${commands.length - 10} more**` : ''),
            inline: false
        });
    }

    // Total accessible commands
    const totalAccessible = Object.values(categories).reduce((sum, cmds) => sum + cmds.length, 0);

    const embed = new EmbedBuilder()
        .setColor(parseInt(dbConfig?.embedSettings?.defaultColor?.replace('#', '') || '370080', 16))
        .setAuthor({
            name: `${dbConfig?.botName || 'Crévion'} - Command List`,
            iconURL: dbConfig?.embedSettings?.thumbnail
        })
        .setTitle('✨ صنع بلمسة من الابداع خصيصا للمبدعين العرب')
        .setDescription(
            `مرحباً! أنا **${dbConfig?.botName || 'Crévion'}**، بوت مصمم خصيصاً لمجتمع Crevion.\n\n` +
            `**🔑 Your Permission Level:** ${getPermissionLevelName(userLevel)}\n` +
            `**📊 Accessible Commands:** ${totalAccessible}\n` +
            `**📌 Prefix:** \`${dbConfig?.prefix || '-'}\` or \`/\` (slash commands)\n\n` +
            `**💡 Tip:** Use the dropdown below to explore categories!`
        )
        .addFields(fields)
        .setThumbnail(dbConfig?.embedSettings?.thumbnail)
        .setFooter({
            text: `${dbConfig?.embedSettings?.footer} | Use /help [command] for details`,
            iconURL: dbConfig?.embedSettings?.footerIcon
        })
        .setTimestamp();

    return embed;
}

// ✅ NEW: Get minimum level required for category
function getCategoryMinLevel(category) {
    const levels = {
        general: PermissionLevels.EVERYONE,
        creativity: PermissionLevels.EVERYONE,
        moderation: PermissionLevels.MODERATOR,
        admin: PermissionLevels.ADMIN,
        owner: PermissionLevels.OWNER
    };
    return levels[category] || PermissionLevels.EVERYONE;
}

// Create help components
function createHelpComponents(client, userLevel) {
    const categories = getCommandsByCategory(client, userLevel);
    
    const options = [];
    
    // ✅ FIXED: Only show categories user can access
    if (categories.general?.length > 0) {
        options.push({
            label: 'General Commands',
            description: `${categories.general.length} commands`,
            value: 'general',
            emoji: '📂'
        });
    }
    
    if (categories.creativity?.length > 0) {
        options.push({
            label: 'Creativity & Showcase',
            description: `${categories.creativity.length} creative tools`,
            value: 'creativity',
            emoji: '🎨'
        });
    }
    
    if (userLevel >= PermissionLevels.MODERATOR && categories.moderation?.length > 0) {
        options.push({
            label: 'Moderation',
            description: `${categories.moderation.length} mod commands`,
            value: 'moderation',
            emoji: '🛡️'
        });
    }
    
    if (userLevel >= PermissionLevels.ADMIN && categories.admin?.length > 0) {
        options.push({
            label: 'Administration',
            description: `${categories.admin.length} admin commands`,
            value: 'admin',
            emoji: '⚙️'
        });
    }
    
    if (userLevel >= PermissionLevels.OWNER && categories.owner?.length > 0) {
        options.push({
            label: 'Owner Only',
            description: `${categories.owner.length} owner commands`,
            value: 'owner',
            emoji: '👑'
        });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder('🔍 Select a category to view commands')
        .addOptions(options);

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Website')
                .setStyle(ButtonStyle.Link)
                .setURL('https://crevion.qzz.io')
                .setEmoji('🌐'),
            new ButtonBuilder()
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/mP9apCqDSZ')
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
                color: 0xED4245,
                description: `❌ Command **${commandName}** not found`
            }],
            ephemeral: true
        });
    }

    const embed = await createCommandDetailEmbed(command, userLevel);
    await interaction.reply({ embeds: [embed], ephemeral: false });
}

// Create command detail embed
async function createCommandDetailEmbed(command, userLevel) {
    const dbConfig = await getConfig();
    const requiredLevel = command.permission !== undefined ? command.permission : PermissionLevels.EVERYONE;
    const hasAccess = userLevel >= requiredLevel;

    const fields = [
        {
            name: '📝 Description',
            value: command.data.description || 'No description',
            inline: false
        },
        {
            name: '🔐 Required Permission',
            value: `${getPermissionLevelName(requiredLevel)} ${hasAccess ? '✅' : '❌'}`,
            inline: true
        },
        {
            name: '📂 Category',
            value: getCategoryFromPermission(requiredLevel),
            inline: true
        }
    ];

    // Usage
    let usage = `\`/${command.data.name}`;
    if (command.data.options?.length > 0) {
        const options = command.data.options.map(opt => 
            opt.required ? `<${opt.name}>` : `[${opt.name}]`
        ).join(' ');
        usage += ` ${options}`;
    }
    usage += '`';

    if (command.prefixAlias) {
        usage += `\n**Prefix:** \`${dbConfig?.prefix || '-'}${command.prefixAlias}\``;
    }

    fields.push({
        name: '💬 Usage',
        value: usage,
        inline: false
    });

    // Parameters
    if (command.data.options?.length > 0) {
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

    const defaultColor = parseInt(dbConfig?.embedSettings?.defaultColor?.replace('#', '') || '370080', 16);
    const errorColor = parseInt(dbConfig?.embedSettings?.errorColor?.replace('#', '') || 'ED4245', 16);

    return new EmbedBuilder()
        .setColor(hasAccess ? defaultColor : errorColor)
        .setTitle(`📌 Command Info: ${command.data.name}`)
        .addFields(fields)
        .setThumbnail(dbConfig?.embedSettings?.thumbnail)
        .setFooter({
            text: dbConfig?.embedSettings?.footer,
            iconURL: dbConfig?.embedSettings?.footerIcon
        })
        .setTimestamp();
}

// ✅ FIXED: Categorize commands hierarchically
function getCommandsByCategory(client, userLevel) {
    const categories = {
        general: [],
        creativity: [],
        moderation: [],
        admin: [],
        owner: []
    };

    client.commands.forEach(cmd => {
        const requiredLevel = cmd.permission !== undefined ? cmd.permission : PermissionLevels.EVERYONE;
        
        // ✅ FIXED: Only show commands user has access to
        if (userLevel < requiredLevel) return;

        // Categorize
        let category = 'general';
        
        if (requiredLevel >= PermissionLevels.OWNER) {
            category = 'owner';
        } else if (requiredLevel >= PermissionLevels.ADMIN) {
            category = 'admin';
        } else if (requiredLevel >= PermissionLevels.MODERATOR) {
            category = 'moderation';
        } else if (cmd.data.name.includes('showcase') || cmd.data.name.includes('color')) {
            category = 'creativity';
        }

        categories[category].push(cmd);
    });

    return categories;
}

function getCategoryEmoji(category) {
    const emojis = {
        general: '📂',
        creativity: '🎨',
        moderation: '🛡️',
        admin: '⚙️',
        owner: '👑'
    };
    return emojis[category] || '📁';
}

function getCategoryDisplayName(category) {
    const names = {
        general: 'General Commands',
        creativity: 'Creativity & Showcase',
        moderation: 'Moderation',
        admin: 'Administration',
        owner: 'Owner Only'
    };
    return names[category] || category;
}

function getCategoryFromPermission(level) {
    if (level >= PermissionLevels.OWNER) return '👑 Owner Only';
    if (level >= PermissionLevels.ADMIN) return '⚙️ Administration';
    if (level >= PermissionLevels.MODERATOR) return '🛡️ Moderation';
    if (level >= PermissionLevels.HELPER) return '🎨 Creativity';
    return '📂 General';
}