import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config/config.js';
import fetch from 'node-fetch';

const AI_CHANNEL_ID = '1437119111221084261';

// Store conversations per user
const conversations = new Map();

// Enhanced system prompt
const SYSTEM_PROMPT = `You are Crevion AI, an elite AI assistant specialized in creative development for the Crevion community.

**Core Expertise:**
- 💻 **Programming**: JavaScript, TypeScript, Python, React, Node.js, Discord.js, APIs, Full-stack development
- 🎨 **Design**: UI/UX, Color Theory, Typography, Figma, Adobe Creative Suite, Branding
- ✂️ **Video Editing**: Premiere Pro, After Effects, DaVinci Resolve, Motion Graphics, VFX
- 🤖 **AI/ML**: APIs integration, Automation, GPT models, Image generation, Data science
- 🚀 **DevOps**: Git, Docker, CI/CD, Cloud platforms, Performance optimization

**Your Capabilities:**
✅ Debug complex code and provide optimized solutions
✅ Write production-ready code following best practices
✅ Create Discord bot commands and features
✅ Design UI/UX mockups and provide design feedback
✅ Generate creative content and ideas
✅ Explain technical concepts clearly with examples
✅ Provide step-by-step tutorials and guides
✅ Review code and suggest improvements
✅ Help with algorithms and data structures
✅ Troubleshoot errors and fix bugs

**Response Guidelines:**
- Be extremely knowledgeable and precise
- Use code blocks with proper language tags (e.g., \`\`\`javascript)
- Keep responses under 1800 characters (split if needed)
- Include relevant emojis for readability
- Provide working, tested code examples
- Be confident but acknowledge limitations when uncertain
- Focus on practical, actionable solutions

**Special Focus Areas:**
- Discord bot development (slash commands, events, embeds)
- Web development (React, Next.js, APIs)
- Design systems and component libraries
- Video editing workflows and effects
- Creative coding and generative art

Always provide **immediate, practical solutions** that users can implement right away.`;

export default {
    name: Events.MessageCreate,
    
    async execute(message, client) {
        // Only work in AI channel
        if (message.channel.id !== AI_CHANNEL_ID) return;
        if (message.author.bot) return;

        const userId = message.author.id;

        try {
            await message.channel.sendTyping();

            // Initialize or get conversation history
            if (!conversations.has(userId)) {
                conversations.set(userId, []);
            }
            const history = conversations.get(userId);

            // Limit history to last 10 messages
            if (history.length > 10) {
                history.splice(0, 2);
            }

            // Get user message
            const userMessage = message.content.trim();

            // Check if GROQ API key exists
            const groqKey = process.env.CLAUDE_API_KEY;
            if (!groqKey) {
                return await message.reply({
                    embeds: [{
                        color: config.settings.errorColor,
                        title: '⚠️ AI Service Not Configured',
                        description: 'GROQ API key is missing.\n\n**Setup:**\n1. Get free API key from [console.groq.com](https://console.groq.com/)\n2. Add to `.env`: `CLAUDE_API_KEY=your_key`\n\n✨ Free tier: 14,400 requests/day!',
                        footer: { text: config.settings.embedFooter }
                    }]
                });
            }

            // Prepare messages for API
            const messages = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...history,
                { role: 'user', content: userMessage }
            ];

            // Call GROQ API
            console.log(`🤖 [AI] Processing request from ${message.author.tag}`);
            
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: messages,
                    max_tokens: 2048,
                    temperature: 0.7,
                    top_p: 0.9
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API Error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            let aiResponse = data.choices[0].message.content;

            // Update conversation history
            history.push(
                { role: 'user', content: userMessage },
                { role: 'assistant', content: aiResponse }
            );

            console.log(`✅ [AI] Response generated (${aiResponse.length} chars)`);

            // Handle long responses
            if (aiResponse.length > 2000) {
                // Split into chunks
                const chunks = aiResponse.match(/[\s\S]{1,1900}/g) || [];
                
                for (let i = 0; i < chunks.length && i < 3; i++) {
                    await message.reply(chunks[i]);
                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } else {
                await message.reply(aiResponse);
            }

            // Add action buttons for code responses
            if (aiResponse.includes('```')) {
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Clear Context')
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId(`clear_context_${userId}`)
                            .setEmoji('🗑️'),
                        new ButtonBuilder()
                            .setLabel('Explain More')
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId(`explain_more_${userId}`)
                            .setEmoji('📚')
                    );

                await message.channel.send({ 
                    content: '💡 **Need more help?**',
                    components: [buttons] 
                });
            }

        } catch (error) {
            console.error('❌ [AI] Error:', error.message);
            
            let errorMsg = '❌ An error occurred. Please try again.';
            
            if (error.message.includes('401')) {
                errorMsg = '🔑 Invalid API key. Check your `API Key` in `.env`';
            } else if (error.message.includes('429')) {
                errorMsg = '⏰ Rate limit reached. Please wait a moment and try again.';
            } else if (error.message.includes('timeout')) {
                errorMsg = '⏱️ Request timed out. Try a shorter question.';
            }

            await message.reply({
                embeds: [{
                    color: config.settings.errorColor,
                    title: '❌ AI Error',
                    description: errorMsg,
                    footer: { text: config.settings.embedFooter }
                }]
            }).catch(() => {});
        }
    }
};

// Handle button interactions (add to interactionCreate.js)
export async function handleAIButtons(interaction) {
    const [action, type, userId] = interaction.customId.split('_');
    
    if (action === 'clear' && type === 'context') {
        if (interaction.user.id !== userId) {
            return await interaction.reply({
                content: '❌ This button is not for you!',
                ephemeral: true
            });
        }
        
        conversations.delete(userId);
        
        await interaction.reply({
            embeds: [{
                color: 0x57F287,
                title: '✅ Context Cleared',
                description: 'Your conversation history has been reset. Start fresh!',
                footer: { text: 'Crevion AI' }
            }],
            ephemeral: true
        });
    }
    
    if (action === 'explain' && type === 'more') {
        await interaction.reply({
            content: 'To get more explanation, simply ask your follow-up question in the channel!',
            ephemeral: true
        });
    }
}