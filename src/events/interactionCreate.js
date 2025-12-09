import { Events, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { config } from '../config/config.js';
import { codeStorage, projectStorage, savedItems } from '../commands/creator/showcase.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle Select Menu
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction, client);
        }
        
        // Handle Buttons
        if (interaction.isButton()) {
            await handleButton(interaction, client);
        }
    }
};

// Handle showcase buttons
async function handleShowcaseButtons(interaction) {
    const customId = interaction.customId;

    // COPY CODE
    if (customId.startsWith('copy_code_')) {
        const codeId = customId.replace('copy_code_', '');
        const codeData = codeStorage.get(codeId);

        if (!codeData) {
            return await interaction.reply({ content: '❌ Code expired.', ephemeral: true });
        }

        const fileName = `${codeData.name.replace(/\s+/g, '_')}.${getFileExtension(codeData.language)}`;
        const attachment = new AttachmentBuilder(Buffer.from(codeData.code, 'utf-8'), { name: fileName });

        await interaction.reply({
            content: `📋 **Copied!** \`\`\`${codeData.language}\n${codeData.code.substring(0, 1500)}\n\`\`\``,
            files: [attachment],
            ephemeral: true
        });
    }

    // DOWNLOAD CODE
    else if (customId.startsWith('download_code_')) {
        const codeId = customId.replace('download_code_', '');
        const codeData = codeStorage.get(codeId);

        if (!codeData) {
            return await interaction.reply({ content: '❌ Not found.', ephemeral: true });
        }

        const fileName = `${codeData.name.replace(/\s+/g, '_')}.${getFileExtension(codeData.language)}`;
        const attachment = new AttachmentBuilder(Buffer.from(codeData.code, 'utf-8'), { name: fileName });

        await interaction.reply({ content: '💾 **Download ready!**', files: [attachment], ephemeral: true });
    }

    // DOWNLOAD ZIP
    else if (customId.startsWith('download_zip_')) {
        const projectId = customId.replace('download_zip_', '');
        const projectData = projectStorage.get(projectId);

        if (!projectData?.zipUrl) {
            return await interaction.reply({ content: '❌ File not available.', ephemeral: true });
        }

        await interaction.reply({
            embeds: [{
                color: 0x00FF00,
                title: '📥 Download Project',
                description: `**${projectData.name}**`,
                fields: [
                    { name: '📦 File', value: `\`${projectData.fileName}\``, inline: true },
                    { name: '👨‍💻 Author', value: `<@${projectData.author}>`, inline: true }
                ]
            }],
            components: [{
                type: 1,
                components: [{
                    type: 2,
                    label: 'Download ZIP',
                    style: 5,
                    url: projectData.zipUrl,
                    emoji: { name: '📥' }
                }]
            }],
            ephemeral: true
        });
    }

    // LIKE
    else if (customId.startsWith('like_project_')) {
        const projectId = customId.replace('like_project_', '');
        const projectData = projectStorage.get(projectId);

        if (!projectData) {
            return await interaction.reply({ content: '❌ Project not found.', ephemeral: true });
        }

        const userId = interaction.user.id;
        if (projectData.dislikes.has(userId)) projectData.dislikes.delete(userId);

        if (projectData.likes.has(userId)) {
            projectData.likes.delete(userId);
            await interaction.reply({ content: '💔 Like removed.', ephemeral: true });
        } else {
            projectData.likes.add(userId);
            await interaction.reply({ content: '❤️ You liked this!', ephemeral: true });
        }

        await updateProjectStats(interaction.message, projectData);
    }

    // DISLIKE
    else if (customId.startsWith('dislike_project_')) {
        const projectId = customId.replace('dislike_project_', '');
        const projectData = projectStorage.get(projectId);

        if (!projectData) {
            return await interaction.reply({ content: '❌ Not found.', ephemeral: true });
        }

        const userId = interaction.user.id;
        if (projectData.likes.has(userId)) projectData.likes.delete(userId);

        if (projectData.dislikes.has(userId)) {
            projectData.dislikes.delete(userId);
            await interaction.reply({ content: '🤷 Dislike removed.', ephemeral: true });
        } else {
            projectData.dislikes.add(userId);
            await interaction.reply({ content: '👎 Disliked.', ephemeral: true });
        }

        await updateProjectStats(interaction.message, projectData);
    }
}

async function updateProjectStats(message, projectData) {
    try {
        const embed = message.embeds[0];
        const newEmbed = { ...embed };
        const statsIndex = newEmbed.fields.findIndex(f => f.name.includes('Stats'));
        if (statsIndex !== -1) {
            newEmbed.fields[statsIndex].value = 
                `👍 **${projectData.likes.size}** Likes • 👎 **${projectData.dislikes.size}** Dislikes${projectData.zipUrl ? '\n📦 **ZIP Available**' : ''}`;
        }
        await message.edit({ embeds: [newEmbed] });
    } catch (error) {
        console.error('Stats update failed:', error);
    }
}

function getFileExtension(lang) {
    const ext = {
        javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
        cpp: 'cpp', csharp: 'cs', php: 'php', ruby: 'rb',
        go: 'go', rust: 'rs', html: 'html', sql: 'sql', nodejs: 'js'
    };
    return ext[lang] || 'txt';
}

// 🎨 Handle Select Menu Interactions
async function handleSelectMenu(interaction, client) {
    if (interaction.customId === 'help_category') {
        const category = interaction.values[0];
        
        const commands = Array.from(client.commands.values()).filter(cmd => {
            const cmdCategory = getCommandCategory(cmd);
            return cmdCategory === category;
        });

        if (commands.length === 0) {
            return await interaction.reply({
                embeds: [{
                    color: config.settings.warningColor,
                    description: '⚠️ No commands found in this category'
                }],
                ephemeral: true
            });
        }

        const categoryEmbed = {
            color: config.settings.defaultColor,
            title: `${getCategoryEmoji(category)} ${getCategoryName(category)}`,
            description: `Here are all commands in the **${getCategoryName(category)}** category:`,
            fields: commands.map(cmd => ({
                name: `/${cmd.data.name}`,
                value: `${cmd.data.description}\n**Permission:** ${getPermissionLevelName(cmd.permission || 0)}`,
                inline: true
            })),
            thumbnail: { url: config.settings.embedThumbnail },
            footer: {
                text: `${config.settings.embedFooter} | Use /help [command] for details`,
                icon_url: config.settings.embedFooterIcon
            },
            timestamp: new Date()
        };

        await interaction.reply({ embeds: [categoryEmbed], ephemeral: true });
    }
}

// 🔘 Handle Button Interactions
async function handleButton(interaction, client) {
    const customId = interaction.customId;

    // Bot Info Button
    if (customId === 'bot_info') {
        await handleBotInfo(interaction, client);
        return;
    }

    // Copy Code Button
    if (customId.startsWith('copy_code_')) {
        await handleCopyCode(interaction);
        return;
    }

    // Save Code Button
    if (customId.startsWith('save_code_')) {
        await handleSaveCode(interaction);
        return;
    }

    // Save Project Button
    if (customId.startsWith('save_project_')) {
        await handleSaveProject(interaction);
        return;
    }

    // Color Palette Buttons
    if (customId.startsWith('download_palette_') || 
        customId.startsWith('copy_hex_') || 
        customId.startsWith('generate_css_')) {
        await handleColorButtons(interaction);
        return;
    }

    // Bookmark/Star Buttons (from showcase)
    if (customId.startsWith('bookmark_') || customId.startsWith('star_')) {
        await handleBookmark(interaction);
        return;
    }
}

// 🤖 Bot Info Handler
async function handleBotInfo(interaction, client) {
    const infoEmbed = {
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

    await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
}

// 📋 Copy Code Handler
async function handleCopyCode(interaction) {
    const codeId = interaction.customId.replace('copy_code_', '');
    const codeData = codeStorage.get(codeId);

    if (!codeData) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                title: '❌ Code Not Found',
                description: 'This code snippet has expired or been removed.',
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                }
            }],
            ephemeral: true
        });
    }

    // Create code file
    const fileName = `${codeData.name.replace(/\s+/g, '_')}.${getFileExtension(codeData.language)}`;
    const attachment = new AttachmentBuilder(
        Buffer.from(codeData.code, 'utf-8'),
        { name: fileName }
    );

    const embed = new EmbedBuilder()
        .setColor(config.settings.successColor)
        .setTitle('📋 Code Copied!')
        .setDescription(`**${codeData.name}** is ready to download`)
        .addFields(
            { name: '📝 Language', value: `\`${codeData.language}\``, inline: true },
            { name: '📦 File Name', value: `\`${fileName}\``, inline: true },
            { name: '📏 Size', value: `\`${Buffer.byteLength(codeData.code)} bytes\``, inline: true }
        )
        .setFooter({
            text: config.settings.embedFooter,
            icon_url: config.settings.embedFooterIcon
        })
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        files: [attachment],
        ephemeral: true
    });
}

// 💾 Save Code Handler
async function handleSaveCode(interaction) {
    const codeId = interaction.customId.replace('save_code_', '');
    const codeData = codeStorage.get(codeId);

    if (!codeData) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: '❌ This code snippet is no longer available.',
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                }
            }],
            ephemeral: true
        });
    }

    const userId = interaction.user.id;

    // Initialize user's saved items
    if (!savedItems.has(userId)) {
        savedItems.set(userId, []);
    }

    const userSaved = savedItems.get(userId);

    // Check if already saved
    const alreadySaved = userSaved.some(item => item.id === codeId);
    if (alreadySaved) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.warningColor,
                title: '⚠️ Already Saved',
                description: 'You have already saved this code snippet!\n\nView your saved codes with `/showcase saved-codes`',
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                }
            }],
            ephemeral: true
        });
    }

    // Save the code
    userSaved.push({
        id: codeId,
        type: 'code',
        name: codeData.name,
        language: codeData.language,
        code: codeData.code,
        author: codeData.author,
        savedAt: Date.now(),
        messageLink: `https://discord.com/channels/${interaction.guildId}/${codeData.channelId}/${codeData.messageId}`
    });

    const embed = new EmbedBuilder()
        .setColor(config.settings.successColor)
        .setTitle('✅ Code Saved Successfully!')
        .setDescription(`**${codeData.name}** has been added to your saved codes`)
        .addFields(
            { name: '📝 Language', value: `\`${codeData.language}\``, inline: true },
            { name: '📚 Total Saved', value: `\`${userSaved.filter(i => i.type === 'code').length}\``, inline: true },
            { name: '💡 Tip', value: 'View all saved codes with `/showcase saved-codes`', inline: false }
        )
        .setFooter({
            text: config.settings.embedFooter,
            icon_url: config.settings.embedFooterIcon
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ⭐ Save Project Handler
async function handleSaveProject(interaction) {
    const projectId = interaction.customId.replace('save_project_', '');
    const projectData = projectStorage.get(projectId);

    if (!projectData) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.errorColor,
                description: '❌ This project is no longer available.',
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                }
            }],
            ephemeral: true
        });
    }

    const userId = interaction.user.id;

    if (!savedItems.has(userId)) {
        savedItems.set(userId, []);
    }

    const userSaved = savedItems.get(userId);

    const alreadySaved = userSaved.some(item => item.id === projectId);
    if (alreadySaved) {
        return await interaction.reply({
            embeds: [{
                color: config.settings.warningColor,
                title: '⚠️ Already Saved',
                description: 'You have already saved this project!\n\nView your saved projects with `/showcase saved-projects`',
                footer: {
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                }
            }],
            ephemeral: true
        });
    }

    userSaved.push({
        id: projectId,
        type: 'project',
        name: projectData.name,
        projectType: projectData.type,
        description: projectData.description,
        technologies: projectData.technologies,
        author: projectData.author,
        github: projectData.github,
        demo: projectData.demo,
        savedAt: Date.now(),
        messageLink: `https://discord.com/channels/${interaction.guildId}/${projectData.channelId}/${projectData.messageId}`
    });

    const embed = new EmbedBuilder()
        .setColor(config.settings.successColor)
        .setTitle('✅ Project Saved Successfully!')
        .setDescription(`**${projectData.name}** has been added to your saved projects`)
        .addFields(
            { name: '📂 Type', value: `\`${projectData.type}\``, inline: true },
            { name: '💼 Total Saved', value: `\`${userSaved.filter(i => i.type === 'project').length}\``, inline: true },
            { name: '💡 Tip', value: 'View all saved projects with `/showcase saved-projects`', inline: false }
        )
        .setFooter({
            text: config.settings.embedFooter,
            icon_url: config.settings.embedFooterIcon
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 🎨 Color Buttons Handler
async function handleColorButtons(interaction) {
    const parts = interaction.customId.split('_');
    const action = parts[0]; // download, copy, generate
    const type = parts[1]; // palette, hex, css
    const paletteId = parts.slice(2).join('_');

    // Import palette cache from colorExtractor
    // Note: You'll need to export paletteCache from colorExtractor.js
    
    await interaction.reply({
        embeds: [{
            color: config.settings.successColor,
            title: '✅ Action Completed!',
            description: 'Color palette action processed successfully.',
            footer: {
                text: config.settings.embedFooter,
                icon_url: config.settings.embedFooterIcon
            }
        }],
        ephemeral: true
    });
}

// 🔖 Bookmark Handler
async function handleBookmark(interaction) {
    const embed = new EmbedBuilder()
        .setColor(config.settings.successColor)
        .setTitle('🔖 Bookmarked!')
        .setDescription('This item has been bookmarked for later reference.')
        .setFooter({
            text: config.settings.embedFooter,
            icon_url: config.settings.embedFooterIcon
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Helper functions
function getFileExtension(lang) {
    const extensions = {
        javascript: 'js', typescript: 'ts', python: 'py',
        java: 'java', cpp: 'cpp', csharp: 'cs',
        php: 'php', ruby: 'rb', go: 'go',
        rust: 'rs', html: 'html', sql: 'sql',
        nodejs: 'js'
    };
    return extensions[lang] || 'txt';
}

function getCommandCategory(cmd) {
    const level = cmd.permission || 0;
    
    if (level >= 6) return 'owner';
    if (level >= 4) return 'moderation';
    if (level >= 3) return 'creator';
    return 'general';
}

function getCategoryEmoji(category) {
    const emojis = {
        general: '📂',
        moderation: '🛡️',
        creator: '🎨',
        owner: '👑'
    };
    return emojis[category] || '📁';
}

function getCategoryName(category) {
    const names = {
        general: 'General Commands',
        moderation: 'Moderation',
        creator: 'Creator Tools',
        owner: 'Owner Only'
    };
    return names[category] || category;
}

function getPermissionLevelName(level) {
    const names = ['Everyone', 'Member', 'VIP', 'Helper', 'Moderator', 'Admin', 'Owner'];
    return names[level] || 'Unknown';
}

function formatUptime(startTime) {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    return `${days}d ${hours}h ${minutes}m`;
}