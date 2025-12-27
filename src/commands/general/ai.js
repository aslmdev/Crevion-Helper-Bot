// src/commands/general/ai.js

import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { aiManager, SYSTEM_PROMPTS } from '../../utils/aiManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('AI-powered assistance (DeepSeek + Groq)')
        .addSubcommand(sub =>
            sub
                .setName('code')
                .setDescription('Generate code (Optimized: Groq)')
                .addStringOption(opt =>
                    opt
                        .setName('request')
                        .setDescription('What do you need? (e.g., "create a discord bot command")')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt
                        .setName('language')
                        .setDescription('Programming language')
                        .addChoices(
                            { name: 'JavaScript', value: 'javascript' },
                            { name: 'TypeScript', value: 'typescript' },
                            { name: 'Python', value: 'python' },
                            { name: 'Java', value: 'java' },
                            { name: 'C++', value: 'cpp' },
                            { name: 'C#', value: 'csharp' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('explain')
                .setDescription('Explain code/concept (Optimized: DeepSeek)')
                .addStringOption(opt =>
                    opt
                        .setName('topic')
                        .setDescription('What to explain?')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('debug')
                .setDescription('Debug code (Optimized: DeepSeek)')
                .addStringOption(opt =>
                    opt
                        .setName('code')
                        .setDescription('Paste your code or describe the error')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('design')
                .setDescription('Get UI/UX design advice (Optimized: Groq)')
                .addStringOption(opt =>
                    opt
                        .setName('request')
                        .setDescription('What design help do you need?')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('review')
                .setDescription('Code review (Optimized: DeepSeek)')
                .addStringOption(opt =>
                    opt
                        .setName('code')
                        .setDescription('Paste your code for review')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('optimize')
                .setDescription('Optimize code (Optimized: DeepSeek)')
                .addStringOption(opt =>
                    opt
                        .setName('code')
                        .setDescription('Code to optimize')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('ask')
                .setDescription('Ask anything (Auto-selects best AI)')
                .addStringOption(opt =>
                    opt
                        .setName('question')
                        .setDescription('Your question')
                        .setRequired(true)
                )
        ),

    permission: PermissionLevels.EVERYONE,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        // Check AI availability
        if (!aiManager.isAvailable()) {
            return await interaction.reply({
                embeds: [{
                    color: 0xED4245,
                    title: '⚠️ AI Not Configured',
                    description: 'No AI APIs are configured. Contact bot owner.',
                    footer: { text: 'Crévion AI' }
                }],
                ephemeral: true
            });
        }

        if (subcommand === 'code') {
            await handleCode(interaction);
        } else if (subcommand === 'explain') {
            await handleExplain(interaction);
        } else if (subcommand === 'debug') {
            await handleDebug(interaction);
        } else if (subcommand === 'design') {
            await handleDesign(interaction);
        } else if (subcommand === 'review') {
            await handleReview(interaction);
        } else if (subcommand === 'optimize') {
            await handleOptimize(interaction);
        } else if (subcommand === 'ask') {
            await handleAsk(interaction);
        }
    }
};

// 💻 Generate Code - Uses GROQ (faster)
async function handleCode(interaction) {
    try {
        await interaction.deferReply();

        const request = interaction.options.getString('request');
        const language = interaction.options.getString('language') || 'javascript';

        const prompt = `Write ${language} code for: ${request}

Requirements:
- Production-ready code
- Proper error handling
- Clear comments
- Best practices
- Modern syntax`;

        const response = await aiManager.request(
            'code_generation',
            SYSTEM_PROMPTS.code_generation,
            prompt
        );

        const embed = new EmbedBuilder()
            .setColor(0x370080)
            .setTitle('💻 Code Generated')
            .setDescription(response.content.substring(0, 4000))
            .addFields(
                { name: '🔤 Language', value: language, inline: true },
                { name: '🤖 AI Model', value: response.model, inline: true }
            )
            .setFooter({ text: `Crévion AI • Powered by ${response.model}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Send as file if too long
        if (response.content.length > 4000) {
            const buffer = Buffer.from(response.content, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { 
                name: `code.${getFileExtension(language)}` 
            });
            await interaction.followUp({ 
                content: '📎 **Full code:**', 
                files: [attachment] 
            });
        }

    } catch (error) {
        console.error('❌ AI Code Error:', error);
        await handleError(interaction, error);
    }
}

// 📚 Explain - Uses DEEPSEEK (better explanations)
async function handleExplain(interaction) {
    try {
        await interaction.deferReply();

        const topic = interaction.options.getString('topic');

        const prompt = `Explain this clearly and thoroughly: ${topic}

Include:
- Simple explanation
- Code examples if relevant
- Common use cases
- Best practices
- Common mistakes to avoid`;

        const response = await aiManager.request(
            'code_explanation',
            SYSTEM_PROMPTS.code_explanation,
            prompt
        );

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`📚 Explaining: ${topic}`)
            .setDescription(response.content.substring(0, 4000))
            .addFields(
                { name: '🤖 AI Model', value: response.model, inline: true }
            )
            .setFooter({ text: `Crévion AI • Powered by ${response.model}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('❌ AI Explain Error:', error);
        await handleError(interaction, error);
    }
}

// 🔍 Debug - Uses DEEPSEEK (best at finding bugs)
async function handleDebug(interaction) {
    try {
        await interaction.deferReply();

        const code = interaction.options.getString('code');

        const prompt = `Debug this code and find all issues:

\`\`\`
${code}
\`\`\`

Provide:
1. All identified issues
2. Why they occur
3. Fixed code
4. Prevention tips`;

        const response = await aiManager.request(
            'debugging',
            SYSTEM_PROMPTS.debugging,
            prompt
        );

        const embed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('🔍 Debug Results')
            .setDescription(response.content.substring(0, 4000))
            .addFields(
                { name: '🤖 AI Model', value: response.model, inline: true }
            )
            .setFooter({ text: `Crévion AI • Powered by ${response.model}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('❌ AI Debug Error:', error);
        await handleError(interaction, error);
    }
}

// 🎨 Design - Uses GROQ (fast and creative)
async function handleDesign(interaction) {
    try {
        await interaction.deferReply();

        const request = interaction.options.getString('request');

        const prompt = `Provide UI/UX design advice for: ${request}

Include:
- Design recommendations
- Color schemes (hex codes)
- Typography suggestions
- Layout ideas
- Accessibility tips`;

        const response = await aiManager.request(
            'design',
            SYSTEM_PROMPTS.design,
            prompt
        );

        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('🎨 Design Advice')
            .setDescription(response.content.substring(0, 4000))
            .addFields(
                { name: '🤖 AI Model', value: response.model, inline: true }
            )
            .setFooter({ text: `Crévion AI • Powered by ${response.model}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('❌ AI Design Error:', error);
        await handleError(interaction, error);
    }
}

// 📋 Review - Uses DEEPSEEK (detailed reviews)
async function handleReview(interaction) {
    try {
        await interaction.deferReply();

        const code = interaction.options.getString('code');

        const prompt = `Review this code professionally:

\`\`\`
${code}
\`\`\`

Provide:
1. Code quality assessment
2. Best practices evaluation
3. Security considerations
4. Performance suggestions
5. Refactoring ideas`;

        const response = await aiManager.request(
            'code_review',
            SYSTEM_PROMPTS.code_explanation,
            prompt
        );

        const embed = new EmbedBuilder()
            .setColor(0x4A90E2)
            .setTitle('📋 Code Review')
            .setDescription(response.content.substring(0, 4000))
            .addFields(
                { name: '🤖 AI Model', value: response.model, inline: true }
            )
            .setFooter({ text: `Crévion AI • Powered by ${response.model}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('❌ AI Review Error:', error);
        await handleError(interaction, error);
    }
}

// ⚡ Optimize - Uses DEEPSEEK (best optimizer)
async function handleOptimize(interaction) {
    try {
        await interaction.deferReply();

        const code = interaction.options.getString('code');

        const prompt = `Optimize this code for better performance:

\`\`\`
${code}
\`\`\`

Provide:
1. Performance analysis
2. Bottlenecks identified
3. Optimized version
4. Explanation of improvements
5. Time/space complexity`;

        const response = await aiManager.request(
            'optimization',
            SYSTEM_PROMPTS.optimization,
            prompt
        );

        const embed = new EmbedBuilder()
            .setColor(0x00D9FF)
            .setTitle('⚡ Code Optimization')
            .setDescription(response.content.substring(0, 4000))
            .addFields(
                { name: '🤖 AI Model', value: response.model, inline: true }
            )
            .setFooter({ text: `Crévion AI • Powered by ${response.model}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('❌ AI Optimize Error:', error);
        await handleError(interaction, error);
    }
}

// 💬 Ask - Auto-selects best AI
async function handleAsk(interaction) {
    try {
        await interaction.deferReply();

        const question = interaction.options.getString('question');

        const response = await aiManager.request(
            'general',
            SYSTEM_PROMPTS.general,
            question
        );

        const embed = new EmbedBuilder()
            .setColor(0x370080)
            .setTitle('💬 AI Response')
            .setDescription(response.content.substring(0, 4000))
            .addFields(
                { name: '🤖 AI Model', value: response.model, inline: true }
            )
            .setFooter({ text: `Crévion AI • Powered by ${response.model}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('❌ AI Ask Error:', error);
        await handleError(interaction, error);
    }
}

// Error handler
async function handleError(interaction, error) {
    const errorEmbed = {
        color: 0xED4245,
        title: '❌ AI Error',
        description: 'Failed to get AI response. Please try again.',
        footer: { text: 'Crévion AI' }
    };

    try {
        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    } catch (e) {
        console.error('Failed to send error message:', e);
    }
}

// Helper
function getFileExtension(language) {
    const extensions = {
        javascript: 'js',
        typescript: 'ts',
        python: 'py',
        java: 'java',
        cpp: 'cpp',
        csharp: 'cs'
    };
    return extensions[language] || 'txt';
}