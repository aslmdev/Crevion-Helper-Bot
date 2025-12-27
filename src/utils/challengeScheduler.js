// src/utils/challengeScheduler.js

import { Challenge, getConfig } from '../models/index.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fetch from 'node-fetch';
import { aiManager, SYSTEM_PROMPTS } from './aiManager.js';

// LeetCode API endpoints (unofficial GraphQL API)
const LEETCODE_API = 'https://leetcode.com/graphql';

class LeetCodeChallengeScheduler {
    constructor(client) {
        this.client = client;
        this.schedulerInterval = null;
    }

    async start() {
        console.log('🧩 Starting LeetCode Challenge Scheduler...');
        await this.checkAndPost();
        
        this.schedulerInterval = setInterval(async () => {
            await this.checkAndPost();
        }, 60 * 60 * 1000); // Check every hour
        
        console.log('✅ Challenge Scheduler started');
    }

    stop() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            console.log('🛑 Challenge Scheduler stopped');
        }
    }

    async checkAndPost() {
        try {
            const dbConfig = await getConfig();
            if (!dbConfig?.features?.problemSolving) {
                console.log('ℹ️  Challenge system disabled');
                return;
            }

            const now = new Date();
            const cairoTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
            const hour = cairoTime.getHours();
            const minute = cairoTime.getMinutes();

            // Post at 12:00 PM Cairo time
            if (hour === 12 && minute < 5) {
                const today = new Date(cairoTime);
                today.setHours(0, 0, 0, 0);
                
                const existingChallenge = await Challenge.findOne({
                    scheduledFor: { $gte: today },
                    status: 'posted'
                });

                if (existingChallenge) {
                    console.log('✅ Challenge already posted today');
                    return;
                }

                await this.postDailyChallenge();
            }
        } catch (error) {
            console.error('❌ Error in scheduler:', error);
        }
    }

    // ✅ NEW: Fetch random problem from LeetCode
    async fetchLeetCodeProblem() {
        try {
            // GraphQL query to get daily problem or random problem
            const query = `
            query questionOfToday {
              activeDailyCodingChallengeQuestion {
                date
                link
                question {
                  title
                  titleSlug
                  difficulty
                  content
                  topicTags {
                    name
                  }
                  codeSnippets {
                    lang
                    code
                  }
                  sampleTestCase
                  exampleTestcases
                }
              }
            }`;

            const response = await fetch(LEETCODE_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query }),
                timeout: 10000
            });

            if (!response.ok) {
                throw new Error(`LeetCode API error: ${response.status}`);
            }

            const data = await response.json();
            const challengeData = data.data.activeDailyCodingChallengeQuestion;

            if (!challengeData) {
                // Fallback: Get random problem
                return await this.getRandomProblem();
            }

            return this.formatLeetCodeProblem(challengeData);

        } catch (error) {
            console.error('❌ LeetCode API error:', error);
            // Fallback to manual problem
            return await this.getRandomProblem();
        }
    }

    // Format LeetCode problem data
    formatLeetCodeProblem(challengeData) {
        const question = challengeData.question;
        
        // Extract language from code snippets
        const jsSnippet = question.codeSnippets.find(s => s.lang === 'JavaScript' || s.lang === 'Python' || s.lang === 'Java');
        const language = jsSnippet ? jsSnippet.lang : 'JavaScript';

        // Get topics
        const topics = question.topicTags.map(t => t.name).slice(0, 3);

        // Extract examples from content (parse HTML)
        const examples = this.extractExamples(question.content);

        return {
            title: question.title,
            difficulty: question.difficulty,
            language: language,
            topics: topics,
            problem: {
                statement: this.cleanHTML(question.content).substring(0, 500) + '...',
                examples: examples,
                constraints: [],
                hints: []
            },
            links: {
                leetcode: `https://leetcode.com${challengeData.link}`
            }
        };
    }

    // Get random problem (fallback)
    async getRandomProblem() {
        const fallbackProblems = [
            {
                title: 'Two Sum',
                difficulty: 'Easy',
                language: 'JavaScript',
                topics: ['Arrays', 'Hash Table'],
                problem: {
                    statement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
                    examples: [{
                        input: 'nums = [2,7,11,15], target = 9',
                        output: '[0,1]',
                        explanation: 'nums[0] + nums[1] == 9'
                    }],
                    constraints: ['2 <= nums.length <= 10^4'],
                    hints: ['Use a hash map for O(n) solution']
                },
                links: {
                    leetcode: 'https://leetcode.com/problems/two-sum/'
                }
            },
            {
                title: 'Reverse Linked List',
                difficulty: 'Easy',
                language: 'Python',
                topics: ['Linked List', 'Recursion'],
                problem: {
                    statement: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
                    examples: [{
                        input: 'head = [1,2,3,4,5]',
                        output: '[5,4,3,2,1]',
                        explanation: 'List is reversed'
                    }],
                    constraints: ['0 <= length <= 5000'],
                    hints: ['Use iterative or recursive approach']
                },
                links: {
                    leetcode: 'https://leetcode.com/problems/reverse-linked-list/'
                }
            }
        ];

        return fallbackProblems[Math.floor(Math.random() * fallbackProblems.length)];
    }

    // Extract examples from HTML content
    extractExamples(htmlContent) {
        // Simple parsing (you can improve this)
        const examples = [];
        const exampleMatches = htmlContent.match(/<strong>Example \d+:<\/strong>[\s\S]*?<\/pre>/g);
        
        if (exampleMatches) {
            for (let i = 0; i < Math.min(exampleMatches.length, 2); i++) {
                examples.push({
                    input: 'See LeetCode link',
                    output: 'See LeetCode link',
                    explanation: 'Check full problem on LeetCode'
                });
            }
        }

        return examples.length > 0 ? examples : [{
            input: 'Example available on LeetCode',
            output: 'See link below',
            explanation: 'Visit LeetCode for full examples'
        }];
    }

    // Clean HTML tags
    cleanHTML(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Post daily challenge
    async postDailyChallenge() {
        try {
            const dbConfig = await getConfig();
            const forumChannelId = dbConfig?.channels?.problemSolving || '1447987005387575460';
            
            const channel = await this.client.channels.fetch(forumChannelId);
            
            if (!channel || !channel.isThreadOnly()) {
                console.error('❌ Forum channel not found');
                return;
            }

            console.log('📥 Fetching challenge from LeetCode...');

            // ✅ Fetch from LeetCode API
            const template = await this.fetchLeetCodeProblem();
            
            console.log(`✅ Got challenge: ${template.title} (${template.difficulty})`);

            // Create embed
            const embed = this.createChallengeEmbed(template);
            
            // ✅ AUTO-SELECT TAGS from forum
            const availableTags = channel.availableTags;
            const selectedTags = [];
            
            // Find difficulty tag
            const difficultyTag = availableTags.find(t => 
                t.name.toLowerCase() === template.difficulty.toLowerCase()
            );
            if (difficultyTag) {
                selectedTags.push(difficultyTag.id);
                console.log(`✅ Tag: ${template.difficulty}`);
            }
            
            // Find language tag
            const langTag = availableTags.find(t => 
                t.name.toLowerCase() === template.language.toLowerCase()
            );
            if (langTag) {
                selectedTags.push(langTag.id);
                console.log(`✅ Tag: ${template.language}`);
            }
            
            // Find topic tags
            for (const topic of template.topics) {
                if (selectedTags.length >= 5) break;
                
                const topicTag = availableTags.find(t => 
                    t.name.toLowerCase().includes(topic.toLowerCase())
                );
                if (topicTag && !selectedTags.includes(topicTag.id)) {
                    selectedTags.push(topicTag.id);
                    console.log(`✅ Tag: ${topic}`);
                }
            }

            if (selectedTags.length < 2) {
                console.error('❌ Not enough tags found!');
                return;
            }

            // Create buttons
            const buttons = this.createChallengeButtons(template);

            // Post challenge
            const thread = await channel.threads.create({
                name: `🧩 ${template.title} [${template.difficulty}]`,
                message: {
                    embeds: [embed],
                    components: buttons
                },
                appliedTags: selectedTags,
                autoArchiveDuration: 1440
            });

            console.log(`✅ Posted: ${template.title}`);

            // Save to database
            await Challenge.create({
                title: template.title,
                description: template.problem.statement,
                difficulty: template.difficulty,
                language: template.language,
                problem: template.problem,
                links: template.links,
                topics: template.topics,
                postId: thread.id,
                channelId: forumChannelId,
                tagIds: selectedTags,
                scheduledFor: new Date(),
                postedAt: new Date(),
                status: 'posted'
            });

        } catch (error) {
            console.error('❌ Error posting challenge:', error);
        }
    }

    createChallengeEmbed(template) {
        const difficultyColors = {
            'Easy': 0x57F287,
            'Medium': 0xFEE75C,
            'Hard': 0xED4245
        };

        const difficultyEmojis = {
            'Easy': '🟢',
            'Medium': '🟡',
            'Hard': '🔴'
        };

        const embed = new EmbedBuilder()
            .setColor(difficultyColors[template.difficulty] || 0x370080)
            .setTitle(`${difficultyEmojis[template.difficulty]} ${template.title}`)
            .setDescription(
                `**Difficulty:** ${template.difficulty}\n` +
                `**Language:** ${template.language}\n` +
                `**Topics:** ${template.topics.join(', ')}\n\n` +
                `**Problem:**\n${template.problem.statement}`
            )
            .setFooter({ text: '🏆 From LeetCode • Solve and showcase your skills!' })
            .setTimestamp();

        // Add examples if available
        if (template.problem.examples?.length > 0) {
            const examplesText = template.problem.examples.map((ex, i) => 
                `**Example ${i + 1}:**\n\`\`\`\nInput: ${ex.input}\nOutput: ${ex.output}\n\`\`\`${ex.explanation ? `\n*${ex.explanation}*` : ''}`
            ).join('\n\n');
            
            embed.addFields({ name: '💡 Examples', value: examplesText.substring(0, 1000), inline: false });
        }

        return embed;
    }

    createChallengeButtons(template) {
        const row = new ActionRowBuilder();

        // LeetCode link
        if (template.links.leetcode) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Solve on LeetCode')
                    .setStyle(ButtonStyle.Link)
                    .setURL(template.links.leetcode)
                    .setEmoji('🔗')
            );
        }

        // AI Hint button
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`challenge_ai_hint_${Date.now()}`)
                .setLabel('Get AI Hint')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🤖')
        );

        return [row];
    }
}

// Export
let schedulerInstance = null;

export function initChallengeScheduler(client) {
    if (!schedulerInstance) {
        schedulerInstance = new LeetCodeChallengeScheduler(client);
        schedulerInstance.start();
    }
    return schedulerInstance;
}

export function getChallengeScheduler() {
    return schedulerInstance;
}

// AI Hint Handler
export async function handleChallengeAIHint(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        if (!aiManager.isAvailable()) {
            return await interaction.editReply({
                content: '❌ AI not configured'
            });
        }

        const thread = interaction.channel;
        const firstMessage = await thread.fetchStarterMessage();
        const embed = firstMessage?.embeds[0];
        
        const title = embed?.title?.replace(/^🟢|🟡|🔴/, '').trim();
        const description = embed?.description || '';

        const hint = await aiManager.request(
            'code_explanation',
            'You are a helpful coding mentor. Give hints without revealing the full solution.',
            `Give me a subtle hint for this problem:\n\n${title}\n\n${description}`
        );

        await interaction.editReply({
            embeds: [{
                color: 0x4A90E2,
                title: '🤖 AI Hint',
                description: hint.content,
                footer: { text: `Powered by ${hint.model} • Keep thinking! 💪` }
            }]
        });

    } catch (error) {
        console.error('❌ AI hint error:', error);
        await interaction.editReply({
            content: '❌ Failed to generate hint.'
        });
    }
}