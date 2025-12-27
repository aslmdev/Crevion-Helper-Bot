// src/events/aiAssistant.js

import { Events, AttachmentBuilder } from 'discord.js';
import { aiManager, SYSTEM_PROMPTS, detectTaskType } from '../utils/aiManager.js';

const AI_CHANNEL_ID = '1437119111221084261';

// Conversation memory per user
const conversations = new Map();
const MAX_HISTORY = 15;

export default {
    name: Events.MessageCreate,
    
    async execute(message, client) {
        // Only AI channel
        if (message.channel.id !== AI_CHANNEL_ID) return;
        if (message.author.bot) return;

        const userId = message.author.id;

        try {
            // Check AI availability
            if (!aiManager.isAvailable()) {
                return await message.reply({
                    content: '⚠️ **AI Not Available**\n\nNo AI APIs configured. Contact bot owner.',
                    allowedMentions: { repliedUser: false }
                });
            }

            // Show typing
            await message.channel.sendTyping();

            // Get/create conversation history
            if (!conversations.has(userId)) {
                conversations.set(userId, []);
            }
            const history = conversations.get(userId);

            // Limit history
            if (history.length > MAX_HISTORY * 2) {
                history.splice(0, 4);
            }

            const userMessage = message.content.trim();

            console.log(`\n🤖 [AI Request]`);
            console.log(`   User: ${message.author.tag}`);
            console.log(`   Message: ${userMessage.substring(0, 100)}...`);

            // Detect language and task
            const isArabic = /[\u0600-\u06FF]/.test(userMessage);
            const taskType = detectTaskType(userMessage);
            
            console.log(`   Language: ${isArabic ? 'Arabic' : 'English'}`);
            console.log(`   Task: ${taskType}`);

            // Build smart system prompt
            let systemPrompt = SYSTEM_PROMPTS[taskType] || SYSTEM_PROMPTS.general;
            
            // Add language instruction
            if (isArabic) {
                systemPrompt += '\n\n**CRITICAL: User is speaking Arabic. You MUST respond in Arabic only. Do not use English.**';
            } else {
                systemPrompt += '\n\n**CRITICAL: User is speaking English. You MUST respond in English only.**';
            }

            // Make AI request with timeout
            const response = await Promise.race([
                aiManager.request(taskType, systemPrompt, userMessage, history),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('timeout')), 25000)
                )
            ]);

            if (!response?.content) {
                throw new Error('No response from AI');
            }

            // Update conversation history
            history.push(
                { role: "user", content: userMessage },
                { role: "assistant", content: response.content }
            );

            console.log(`   ✅ Response: ${response.content.length} chars from ${response.model}\n`);

            // Send response
            await sendAIResponse(message, response.content, response.model);

        } catch (error) {
            console.error('\n❌ [AI Error]:', error.message, '\n');
            await handleAIError(message, error);
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// 📤 SEND AI RESPONSE
// ═══════════════════════════════════════════════════════════════

async function sendAIResponse(message, content, modelName) {
    try {
        const maxLength = 1950;

        // If short, send as reply
        if (content.length <= maxLength) {
            await message.reply({
                content: content,
                allowedMentions: { repliedUser: false }
            });
            return;
        }

        // If long, split intelligently
        const chunks = splitIntelligently(content, maxLength);

        // Send first chunk as reply
        await message.reply({
            content: chunks[0],
            allowedMentions: { repliedUser: false }
        });

        // Send rest as normal messages
        for (let i = 1; i < Math.min(chunks.length, 5); i++) {
            await new Promise(r => setTimeout(r, 1000));
            await message.channel.send(chunks[i]);
        }

        // If too long, offer file download
        if (chunks.length > 5) {
            const fullText = chunks.join('\n\n---\n\n');
            const buffer = Buffer.from(fullText, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { 
                name: `ai-response-${Date.now()}.txt` 
            });

            await message.channel.send({
                content: `📎 **Full response is too long!**\n*Download the complete answer:*`,
                files: [attachment]
            });
        }

    } catch (error) {
        console.error('❌ Send response error:', error);
        throw error;
    }
}

// Split text intelligently at sentence/paragraph boundaries
function splitIntelligently(text, maxLength) {
    const chunks = [];
    let current = '';

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);

    for (const para of paragraphs) {
        // If adding this paragraph exceeds limit
        if (current.length + para.length + 2 > maxLength) {
            if (current) {
                chunks.push(current.trim());
                current = '';
            }

            // If paragraph itself is too long, split by sentences
            if (para.length > maxLength) {
                const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
                
                for (const sentence of sentences) {
                    if (current.length + sentence.length + 1 > maxLength) {
                        if (current) chunks.push(current.trim());
                        current = sentence;
                    } else {
                        current += ' ' + sentence;
                    }
                }
            } else {
                current = para;
            }
        } else {
            current += (current ? '\n\n' : '') + para;
        }
    }

    if (current) chunks.push(current.trim());

    return chunks;
}

// ═══════════════════════════════════════════════════════════════
// ❌ ERROR HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleAIError(message, error) {
    const errorMsg = error.message.toLowerCase();

    let userMessage = '❌ **حدث خطأ**\n\n';

    if (errorMsg.includes('timeout')) {
        userMessage += 'استغرق الـ AI وقت طويل للرد. حاول مرة تانية بسؤال أقصر.';
    } else if (errorMsg.includes('api') || errorMsg.includes('model')) {
        userMessage += 'الـ AI مش متاح حالياً. جرب تاني بعد شوية.';
    } else if (errorMsg.includes('no response')) {
        userMessage += 'الـ AI مردش. حاول تاني.';
    } else {
        userMessage += 'حاجة غلط حصلت. جرب تاني.';
    }

    await message.reply({
        content: userMessage,
        allowedMentions: { repliedUser: false }
    }).catch(err => {
        console.error('❌ Could not send error message:', err);
    });
}

// ═══════════════════════════════════════════════════════════════
// 🔘 BUTTON HANDLERS (for other features)
// ═══════════════════════════════════════════════════════════════

export async function handleAIButtons(interaction) {
    const customId = interaction.customId;
    
    try {
        // Clear context
        if (customId.startsWith('clear_context_')) {
            const userId = interaction.user.id;
            conversations.delete(userId);
            
            await interaction.reply({
                content: '✅ **تم مسح المحادثة**\n\nتقدر تبدأ محادثة جديدة دلوقتي!',
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('❌ Button error:', error);
        await interaction.reply({
            content: '❌ فشل تنفيذ الأمر',
            ephemeral: true
        }).catch(() => {});
    }
}