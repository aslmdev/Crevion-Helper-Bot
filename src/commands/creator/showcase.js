import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { config } from '../../config/config.js';

const CHANNELS = {
    codes: '1424814715439288454',
    projects: '1435190203798126602'
};

// Storage for projects and reactions
const projectStorage = new Map(); // projectId -> { zipUrl, likes: Set(), dislikes: Set() }
const codeStorage = new Map(); // codeId -> { code, language }

export default {
    data: new SlashCommandBuilder()
        .setName('showcase')
        .setDescription('🌟 Share your legendary work with the community')
        .addSubcommand(sub =>
            sub.setName('code')
                .setDescription('📝 Share an epic code snippet')
                .addStringOption(opt => opt
                    .setName('name')
                    .setDescription('Code name')
                    .setRequired(true))
                .addStringOption(opt => opt
                    .setName('language')
                    .setDescription('Programming language')
                    .setRequired(true)
                    .addChoices(
                        { name: '⚡ JavaScript', value: 'javascript' },
                        { name: '🔷 TypeScript', value: 'typescript' },
                        { name: '🐍 Python', value: 'python' },
                        { name: '🟢 Node.js', value: 'nodejs' },
                        { name: '☕ Java', value: 'java' },
                        { name: '⚙️ C++', value: 'cpp' },
                        { name: '💎 C#', value: 'csharp' },
                        { name: '🐘 PHP', value: 'php' },
                        { name: '💎 Ruby', value: 'ruby' },
                        { name: '🔵 Go', value: 'go' },
                        { name: '🦀 Rust', value: 'rust' },
                        { name: '🌐 HTML/CSS', value: 'html' },
                        { name: '🗄️ SQL', value: 'sql' }
                    ))
                .addStringOption(opt => opt
                    .setName('description')
                    .setDescription('What does this code do?')
                    .setRequired(true))
                .addStringOption(opt => opt
                    .setName('code')
                    .setDescription('The code (use \\n for new lines)')
                    .setRequired(true))
                .addStringOption(opt => opt
                    .setName('usage')
                    .setDescription('How to use it')
                    .setRequired(false))
                .addStringOption(opt => opt
                    .setName('github')
                    .setDescription('GitHub repository URL')
                    .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('project')
                .setDescription('🚀 Launch your legendary project')
                .addStringOption(opt => opt
                    .setName('name')
                    .setDescription('Project name')
                    .setRequired(true))
                .addStringOption(opt => opt
                    .setName('type')
                    .setDescription('Project type')
                    .setRequired(true)
                    .addChoices(
                        { name: '🌐 Web App', value: 'web' },
                        { name: '📱 Mobile App', value: 'mobile' },
                        { name: '🎮 Game', value: 'game' },
                        { name: '🤖 Bot', value: 'bot' },
                        { name: '🛠️ Tool', value: 'tool' },
                        { name: '📚 Library', value: 'library' },
                        { name: '🎨 Design', value: 'design' }
                    ))
                .addStringOption(opt => opt
                    .setName('description')
                    .setDescription('Project description')
                    .setRequired(true))
                .addStringOption(opt => opt
                    .setName('technologies')
                    .setDescription('Tech stack (comma separated)')
                    .setRequired(true))
                .addStringOption(opt => opt
                    .setName('features')
                    .setDescription('Key features (comma separated)')
                    .setRequired(false))
                .addStringOption(opt => opt
                    .setName('github')
                    .setDescription('GitHub URL')
                    .setRequired(false))
                .addStringOption(opt => opt
                    .setName('demo')
                    .setDescription('Live demo URL')
                    .setRequired(false))
                .addAttachmentOption(opt => opt
                    .setName('file')
                    .setDescription('Project ZIP file or preview image/video')
                    .setRequired(false))
        ),

    permission: PermissionLevels.HELPER, // Creator Tools

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'code') {
            await handleCodeShowcase(interaction, client);
        } else if (subcommand === 'project') {
            await handleProjectShowcase(interaction, client);
        }
    }
};

// 📝 CODE SHOWCASE - LEGENDARY VERSION
async function handleCodeShowcase(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('name');
    const language = interaction.options.getString('language');
    const description = interaction.options.getString('description');
    let code = interaction.options.getString('code').replace(/\\n/g, '\n');
    const usage = interaction.options.getString('usage');
    const github = interaction.options.getString('github');

    try {
        const channel = await client.channels.fetch(CHANNELS.codes);
        const codeId = `code_${Date.now()}_${interaction.user.id}`;

        // Store code for copy button
        codeStorage.set(codeId, { code, language, name, author: interaction.user.id });

        const embed = new EmbedBuilder()
            .setColor(config.settings.defaultColor)
            .setAuthor({
                name: `${interaction.user.username} shared legendary code`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTitle(`${getLanguageEmoji(language)} \`${name}\``)
            .setDescription(`**${description}**\n\n${getLanguageQuote(language)}`)
            .addFields(
                { 
                    name: '💻 Language', 
                    value: `\`\`\`fix\n${language.toUpperCase()}\n\`\`\``, 
                    inline: true 
                },
                { 
                    name: '👨‍💻 Author', 
                    value: `<@${interaction.user.id}>`, 
                    inline: true 
                },
                { 
                    name: '⭐ Quality', 
                    value: '```diff\n+ LEGENDARY\n```', 
                    inline: true 
                }
            );

        if (usage) {
            embed.addFields({ 
                name: '💡 Usage Guide', 
                value: `\`\`\`yaml\n${usage.substring(0, 500)}\n\`\`\``, 
                inline: false 
            });
        }

        // Code display
        if (code.length > 1000) {
            const codeFile = new AttachmentBuilder(
                Buffer.from(code, 'utf-8'), 
                { name: `${name.replace(/\s+/g, '_')}.${getFileExtension(language)}` }
            );
            
            embed.addFields({
                name: '📄 Code File',
                value: `\`\`\`${language}\n${code.substring(0, 150)}...\n(Full code in attached file)\n\`\`\``,
                inline: false
            });

            // Legendary buttons
            const buttons = createLegendaryCodeButtons(codeId, github, interaction.user.id);
            
            const msg = await channel.send({ 
                embeds: [embed], 
                files: [codeFile],
                components: [buttons] 
            });

            // Auto-react with fire emoji
            await msg.react('🔥');

        } else {
            embed.addFields({
                name: '💻 Code',
                value: `\`\`\`${language}\n${code}\n\`\`\``,
                inline: false
            });

            const buttons = createLegendaryCodeButtons(codeId, github, interaction.user.id);
            
            const msg = await channel.send({ 
                embeds: [embed],
                components: [buttons] 
            });

            await msg.react('🔥');
        }

        embed.setFooter({
            text: `${config.settings.embedFooter} | Code ID: ${codeId}`,
            icon_url: config.settings.embedFooterIcon
        });
        embed.setTimestamp();

        await interaction.editReply({
            embeds: [{
                color: 0x00FF00,
                title: '✅ Code Showcased Successfully!',
                description: `🔥 Your **legendary code** has been shared in <#${CHANNELS.codes}>`,
                fields: [
                    { name: '📝 Name', value: `\`${name}\``, inline: true },
                    { name: '💻 Language', value: `\`${language}\``, inline: true },
                    { name: '🆔 ID', value: `\`${codeId}\``, inline: true }
                ],
                footer: { text: config.settings.embedFooter }
            }]
        });

    } catch (error) {
        console.error('❌ Error in code showcase:', error);
        await interaction.editReply({
            embeds: [{
                color: 0xFF0000,
                description: `❌ Failed: ${error.message}`
            }]
        });
    }
}

// 🚀 PROJECT SHOWCASE - LEGENDARY VERSION
async function handleProjectShowcase(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('name');
    const type = interaction.options.getString('type');
    const description = interaction.options.getString('description');
    const technologies = interaction.options.getString('technologies');
    const features = interaction.options.getString('features');
    const github = interaction.options.getString('github');
    const demo = interaction.options.getString('demo');
    const file = interaction.options.getAttachment('file');

    try {
        const channel = await client.channels.fetch(CHANNELS.projects);
        const projectId = `project_${Date.now()}_${interaction.user.id}`;

        // Store project data
        projectStorage.set(projectId, {
            zipUrl: file?.url || null,
            fileName: file?.name || null,
            likes: new Set(),
            dislikes: new Set(),
            author: interaction.user.id,
            name: name
        });

        const embed = new EmbedBuilder()
            .setColor(config.settings.defaultColor)
            .setAuthor({
                name: `${interaction.user.username} launched a legendary project`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTitle(`${getProjectTypeEmoji(type)} **${name}**`)
            .setDescription(`**${description}**\n\n*${getProjectQuote(type)}*`)
            .addFields(
                { 
                    name: '📂 Type', 
                    value: `\`\`\`yaml\n${getProjectTypeName(type)}\n\`\`\``, 
                    inline: true 
                },
                { 
                    name: '👨‍💻 Developer', 
                    value: `<@${interaction.user.id}>`, 
                    inline: true 
                },
                { 
                    name: '🏆 Status', 
                    value: '```diff\n+ LEGENDARY\n```', 
                    inline: true 
                }
            );

        // Tech stack
        const techBadges = technologies.split(',')
            .map(t => `\`${t.trim()}\``)
            .join(' • ');
        
        embed.addFields({
            name: '🛠️ **Tech Stack**',
            value: techBadges,
            inline: false
        });

        // Features
        if (features) {
            const featuresList = features.split(',')
                .map((f, i) => `${['✨', '⚡', '🎯', '🔥', '💎'][i % 5]} ${f.trim()}`)
                .join('\n');
            
            embed.addFields({
                name: '🎯 **Features**',
                value: featuresList.substring(0, 1024),
                inline: false
            });
        }

        // Stats placeholder
        embed.addFields({
            name: '📊 **Project Stats**',
            value: `👍 **0** Likes • 👎 **0** Dislikes${file ? '\n📦 **ZIP File Available**' : ''}`,
            inline: false
        });

        // Handle media
        if (file) {
            if (file.contentType?.startsWith('image/')) {
                embed.setImage(file.url);
            } else if (file.contentType?.startsWith('video/')) {
                embed.addFields({
                    name: '🎥 Demo Video',
                    value: `[Watch Demo](${file.url})`,
                    inline: false
                });
            }
        }

        embed.setFooter({
            text: `${config.settings.embedFooter} | Project ID: ${projectId}`,
            icon_url: config.settings.embedFooterIcon
        });
        embed.setTimestamp();

        // LEGENDARY BUTTONS
        const buttons = createLegendaryProjectButtons(projectId, github, demo, file?.url);

        const msg = await channel.send({ 
            embeds: [embed],
            components: [buttons] 
        });

        // Auto-react
        await msg.react('🔥');
        await msg.react('⭐');

        await interaction.editReply({
            embeds: [{
                color: 0x00FF00,
                title: '✅ Project Launched Successfully!',
                description: `🚀 Your **legendary project** has been showcased in <#${CHANNELS.projects}>`,
                fields: [
                    { name: '🚀 Name', value: `\`${name}\``, inline: true },
                    { name: '📂 Type', value: `\`${getProjectTypeName(type)}\``, inline: true },
                    { name: '🆔 ID', value: `\`${projectId}\``, inline: true }
                ],
                footer: { text: config.settings.embedFooter }
            }]
        });

    } catch (error) {
        console.error('❌ Error in project showcase:', error);
        await interaction.editReply({
            embeds: [{
                color: 0xFF0000,
                description: `❌ Failed: ${error.message}`
            }]
        });
    }
}

// 🔘 LEGENDARY CODE BUTTONS
function createLegendaryCodeButtons(codeId, github, authorId) {
    const row = new ActionRowBuilder();

    if (github) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('View on GitHub')
                .setStyle(ButtonStyle.Link)
                .setURL(github)
                .setEmoji('📦')
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setLabel('Copy Code')
            .setStyle(ButtonStyle.Success)
            .setCustomId(`copy_code_${codeId}`)
            .setEmoji('📋'),
        new ButtonBuilder()
            .setLabel('Download File')
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`download_code_${codeId}`)
            .setEmoji('💾'),
        new ButtonBuilder()
            .setLabel('Contact Author')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/users/${authorId}`)
            .setEmoji('💬')
    );

    return row;
}

// 🔘 LEGENDARY PROJECT BUTTONS
function createLegendaryProjectButtons(projectId, github, demo, zipUrl) {
    const row = new ActionRowBuilder();

    if (github) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('GitHub')
                .setStyle(ButtonStyle.Link)
                .setURL(github)
                .setEmoji('📦')
        );
    }

    if (demo) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('Live Demo')
                .setStyle(ButtonStyle.Link)
                .setURL(demo)
                .setEmoji('🌐')
        );
    }

    if (zipUrl) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('Download ZIP')
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`download_zip_${projectId}`)
                .setEmoji('📥')
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setLabel('Like')
            .setStyle(ButtonStyle.Success)
            .setCustomId(`like_project_${projectId}`)
            .setEmoji('👍'),
        new ButtonBuilder()
            .setLabel('Dislike')
            .setStyle(ButtonStyle.Danger)
            .setCustomId(`dislike_project_${projectId}`)
            .setEmoji('👎')
    );

    return row;
}

// Helper functions
function getLanguageEmoji(lang) {
    const emojis = {
        javascript: '⚡', typescript: '🔷', nodejs: '🟢',
        python: '🐍', java: '☕', cpp: '⚙️',
        csharp: '💎', php: '🐘', ruby: '💎',
        go: '🔵', rust: '🦀', html: '🌐', sql: '🗄️'
    };
    return emojis[lang] || '💻';
}

function getLanguageQuote(lang) {
    const quotes = {
        javascript: '*"The language that powers the modern web"*',
        python: '*"Beautiful is better than ugly"*',
        nodejs: '*"JavaScript everywhere"*',
        typescript: '*"JavaScript that scales"*'
    };
    return quotes[lang] || '*"Code with passion"*';
}

function getProjectTypeEmoji(type) {
    const emojis = {
        web: '🌐', mobile: '📱', game: '🎮',
        bot: '🤖', tool: '🛠️', library: '📚', design: '🎨'
    };
    return emojis[type] || '💻';
}

function getProjectTypeName(type) {
    const names = {
        web: 'Web Application', mobile: 'Mobile App',
        game: 'Game', bot: 'Bot/Automation',
        tool: 'Tool/Utility', library: 'Library',
        design: 'Design System'
    };
    return names[type] || type;
}

function getProjectQuote(type) {
    const quotes = {
        web: 'Built with modern technologies',
        mobile: 'Cross-platform excellence',
        game: 'Immersive gaming experience',
        bot: 'Automated for efficiency'
    };
    return quotes[type] || 'Crafted with dedication';
}

function getFileExtension(lang) {
    const extensions = {
        javascript: 'js', typescript: 'ts', python: 'py',
        java: 'java', cpp: 'cpp', csharp: 'cs',
        php: 'php', ruby: 'rb', go: 'go',
        rust: 'rs', html: 'html', sql: 'sql', nodejs: 'js'
    };
    return extensions[lang] || 'txt';
}

export { projectStorage, codeStorage };