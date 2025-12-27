// src/utils/aiManager.js

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// AI Models Configuration - UPDATED WITH NEW GROQ MODELS
const AI_MODELS = {
    GROQ: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile', // ✅ NEW MODEL (replaces mixtral)
        strengths: ['code_generation', 'problem_solving', 'speed'],
        maxTokens: 8000
    },
    DEEPSEEK: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
        strengths: ['code_explanation', 'debugging', 'optimization'],
        maxTokens: 4000
    }
};

// Task types and their best AI
const TASK_AI_MAP = {
    code_generation: 'GROQ',
    code_explanation: 'DEEPSEEK',
    code_review: 'DEEPSEEK',
    debugging: 'DEEPSEEK',
    optimization: 'DEEPSEEK',
    general: 'GROQ',
    design: 'GROQ',
    quick_answer: 'GROQ'
};

class DualAIManager {
    constructor() {
        this.groqAvailable = !!GROQ_API_KEY;
        this.deepseekAvailable = !!DEEPSEEK_API_KEY;
        
        if (!this.groqAvailable && !this.deepseekAvailable) {
            console.error('❌ No AI APIs configured!');
        } else {
            console.log(`✅ AI System: ${this.groqAvailable ? 'Groq(llama-3.3)✓' : ''} ${this.deepseekAvailable ? 'DeepSeek✓' : ''}`);
        }
    }

    selectAI(taskType) {
        const preferredAI = TASK_AI_MAP[taskType] || 'GROQ';
        
        if (preferredAI === 'GROQ' && this.groqAvailable) return AI_MODELS.GROQ;
        if (preferredAI === 'DEEPSEEK' && this.deepseekAvailable) return AI_MODELS.DEEPSEEK;
        
        if (this.groqAvailable) return AI_MODELS.GROQ;
        if (this.deepseekAvailable) return AI_MODELS.DEEPSEEK;
        
        return null;
    }

    async request(taskType, systemPrompt, userMessage, conversationHistory = []) {
        const ai = this.selectAI(taskType);
        
        if (!ai) {
            throw new Error('No AI available');
        }

        const apiKey = ai.name === 'Groq' ? GROQ_API_KEY : DEEPSEEK_API_KEY;

        try {
            console.log(`🤖 Using ${ai.name} (${ai.model}) for ${taskType}`);

            const response = await fetch(ai.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: ai.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...conversationHistory,
                        { role: 'user', content: userMessage }
                    ],
                    max_tokens: ai.maxTokens,
                    temperature: 0.7,
                    top_p: 0.9
                }),
                timeout: 30000
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`${ai.name} API error: ${error}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            console.log(`✅ ${ai.name} responded: ${content.length} chars`);

            return {
                content,
                model: ai.name,
                tokensUsed: data.usage?.total_tokens || 0
            };

        } catch (error) {
            console.error(`❌ ${ai.name} error:`, error.message);
            
            // Auto-fallback to other AI (ONLY ONCE)
            if (ai.name === 'Groq' && this.deepseekAvailable) {
                console.log('🔄 Falling back to DeepSeek...');
                
                try {
                    const fallbackResponse = await fetch(AI_MODELS.DEEPSEEK.baseUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: AI_MODELS.DEEPSEEK.model,
                            messages: [
                                { role: 'system', content: systemPrompt },
                                ...conversationHistory,
                                { role: 'user', content: userMessage }
                            ],
                            max_tokens: AI_MODELS.DEEPSEEK.maxTokens,
                            temperature: 0.7
                        }),
                        timeout: 30000
                    });
                    
                    if (fallbackResponse.ok) {
                        const data = await fallbackResponse.json();
                        return {
                            content: data.choices[0].message.content,
                            model: 'DeepSeek',
                            tokensUsed: data.usage?.total_tokens || 0
                        };
                    }
                } catch (fallbackError) {
                    console.error('❌ Fallback also failed:', fallbackError.message);
                }
            }
            
            throw error;
        }
    }

    isAvailable() {
        return this.groqAvailable || this.deepseekAvailable;
    }

    getStatus() {
        return {
            groq: this.groqAvailable,
            deepseek: this.deepseekAvailable,
            preferred: this.groqAvailable ? 'Groq' : (this.deepseekAvailable ? 'DeepSeek' : 'None')
        };
    }
}

export const aiManager = new DualAIManager();

// System prompts
export const SYSTEM_PROMPTS = {
    general: `You are Crevion AI, an elite assistant for developers and designers at Crevion Community.

**Your Role:**
- Help developers learn and grow
- Provide clear, practical solutions
- Be encouraging and supportive
- Match the user's language (Arabic or English)

**Expertise:**
- Programming: JavaScript, TypeScript, Python, React, Node.js, Discord.js
- Design: UI/UX, Color Theory, Web Design, CSS
- Problem Solving: Algorithms, Data Structures, Debugging

**Communication Style:**
- Be natural and conversational (like talking to a friend)
- Use emojis sparingly (only when they add value)
- Give complete, working solutions
- Explain concepts clearly
- Be encouraging and positive

**CRITICAL RULES:**
- NEVER mention your AI model name in responses
- NEVER add signatures like "- Groq" or "- DeepSeek" at the end
- Match the user's language exactly (if they speak Arabic, respond in Arabic only)
- Focus on being helpful, not on branding`,

    code_generation: `You are an expert programmer. Generate clean, production-ready code.

**Requirements:**
- Include proper error handling
- Follow best practices
- Add clear comments
- Use modern syntax
- Optimize performance`,

    code_explanation: `You are a patient teacher. Explain code clearly and thoroughly.

**Guidelines:**
- Start with simple explanations
- Use analogies and examples
- Break down complex topics step-by-step
- Highlight important concepts`,

    debugging: `You are a debugging expert. Find issues and provide solutions.

**Approach:**
- Identify all potential bugs
- Explain why they occur
- Provide fixed code
- Suggest prevention tips`,

    optimization: `You are a performance optimization expert.

**Focus:**
- Identify bottlenecks
- Suggest optimizations
- Provide benchmarks
- Explain trade-offs`,

    design: `You are a UI/UX design expert.

**Provide:**
- Modern design principles
- Color schemes (hex codes)
- Typography suggestions
- Layout ideas
- Accessibility tips`
};

export function detectTaskType(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('write') || lower.includes('create') || lower.includes('generate')) {
        return 'code_generation';
    }
    if (lower.includes('explain') || lower.includes('what is') || lower.includes('how does')) {
        return 'code_explanation';
    }
    if (lower.includes('review') || lower.includes('check')) {
        return 'code_review';
    }
    if (lower.includes('debug') || lower.includes('fix') || lower.includes('error')) {
        return 'debugging';
    }
    if (lower.includes('optimize') || lower.includes('performance')) {
        return 'optimization';
    }
    if (lower.includes('design') || lower.includes('ui') || lower.includes('ux')) {
        return 'design';
    }
    
    return 'general';
}