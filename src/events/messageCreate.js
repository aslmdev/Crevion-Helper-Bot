import { Events, AttachmentBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { config } from '../config/config.js';
import { hasPermission, getPermissionErrorMessage, getUserPermissionLevel, getCommandRequiredLevel } from '../utils/permissions.js';
import { autoReply } from '../utils/autoreply.js';
import { autoLine } from '../utils/autoline.js';
import { lineManager } from '../utils/lineManager.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;

        try {
            await processMessage(message, client);
        } catch (error) {
            console.error('❌ Error in messageCreate:', error);
        }
    }
};

async function processMessage(message, client) {
    
    // 💬 Bot mention response
    const botMentioned = message.mentions.has(client.user);
    const hasEveryone = message.mentions.everyone;

    if (botMentioned && !hasEveryone) {
        const embed = {
            color: config.settings.defaultColor,
            title: '# **مرحبا بك في مجتمع الابداع !**',
            description: `هنا يجتمع المبدعون من كل مجالات الإبداع الرقمي في مساحة واحدة تجمع الشغف، التعاون، والإلهام.\nنهدف إلى بناء بيئة راقية وصناعة محتوى مميز ، وتدعم كل من يسعى للتطور وتحقيق رؤيته الإبداعية.\n\nسواء كنت في بداية رحلتك أو محترفًا في مجالك،\nستجد هنا كل ما تحتاجه للنمو — من تحديات شهرية وورش تعليمية إلى تعاون بين الأعضاء ومشاريع مشتركة.\n\nهدفنا هو خلق مجتمع حقيقي يجمع العقول المبدعة،\nويشجع على مشاركة المعرفة، وبناء علاقات تعاونية تفتح آفاقًا جديدة لكل عضو.\n\nهنا، لا حدود للإبداع — فقط شغف، تطوّر، وفرص لا تنتهي.\n\nومع الإبداع، يأتي جو المجتمع — فعاليات، تفاعل، وطاقة تشعل الحماس وتحوّل كل لحظة لتجربة ملهمة.\n\nانضم إلينا وكن جزءًا من هذا العالم الذي يقدّر الإبداع ويسعى دائمًا نحو التميّز والابتكار.`,
            thumbnail: { url: config.settings.embedThumbnail },
            footer: {
                text: config.settings.embedFooter,
                icon_url: config.settings.embedFooterIcon
            },
            timestamp: new Date()
        };

        return await message.reply({ embeds: [embed] });
    }

    // 🎨 Auto Line System - INSTANT (NO COOLDOWN)
    const lineUrl = lineManager.getUrl();
    if (autoLine.isEnabled(message.channel.id) && lineUrl) {
        try {
            // Send line immediately after every message
            const response = await fetch(lineUrl);
            if (response.ok) {
                const buffer = await response.arrayBuffer();
                const attachment = new AttachmentBuilder(Buffer.from(buffer), { name: 'line.png' });
                await message.channel.send({ files: [attachment] });
                autoLine.incrementCount(message.channel.id);
            }
        } catch (err) {
            console.error('❌ Auto line error:', err.message);
        }
    }

    // 🤖 Auto Reply System
    const replyData = autoReply.check(message);
    if (replyData) {
        try {
            let responseContent = replyData.response;
            
            if (replyData.mention) {
                responseContent = `${message.author} ${responseContent}`;
            }

            if (replyData.reply) {
                await message.reply(responseContent);
            } else {
                await message.channel.send(responseContent);
            }
        } catch (err) {
            console.error('❌ Error sending auto reply:', err.message);
        }
    }

    // 📝 Manual line trigger commands ("خط" or "line") - Role-based permission
    const content = message.content.trim().toLowerCase();
    if (content === "خط" || content === "line") {
        const member = await message.guild.members.fetch(message.author.id);
        
        // Check if member has allowed role
        if (!lineManager.hasPermission(member)) {
            // Silently ignore if user doesn't have permission
            return;
        }

        const lineUrl = lineManager.getUrl();
        if (!lineUrl) {
            return await message.reply("⚠️ No line image configured. Ask an admin to set one using `/line set`");
        }

        try {
            const response = await fetch(lineUrl);
            if (!response.ok) throw new Error('Failed to fetch image');
            
            const buffer = await response.arrayBuffer();
            const attachment = new AttachmentBuilder(Buffer.from(buffer), { name: 'line.png' });

            await message.delete().catch(() => {}); // Delete user message
            await message.channel.send({ files: [attachment] });

        } catch (err) {
            console.error('❌ Error sending line image:', err.message);
            await message.reply('❌ Error loading image. Please check the URL!');
        }
        return;
    }

    // 🔧 Prefix Commands Handler
    const prefix = config.settings.prefix;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = client.prefixCommands.get(commandName);
    if (!command) return;

    try {
        // 🔐 Permission check
        if (command.permission !== undefined) {
            const member = await message.guild.members.fetch(message.author.id);
            
            if (!hasPermission(member, commandName, command.permission)) {
                const requiredLevel = getCommandRequiredLevel(commandName, command.permission);
                const errorMsg = getPermissionErrorMessage(requiredLevel);
                return await message.reply(errorMsg);
            }
        }

        // Execute command
        await command.executePrefix(message, args, client);
        client.stats.commandsExecuted++;

        // Log command
        if (config.features.commandLogging) {
            console.log(`📝 ${message.author.tag} used ${prefix}${commandName}`);
        }

    } catch (err) {
        console.error(`❌ Error in prefix command ${commandName}:`, err);
        client.stats.errors++;

        const errorEmbed = {
            color: config.settings.errorColor,
            title: '❌ Error',
            description: 'An error occurred while executing the command. Please try again.',
            footer: {
                text: config.settings.embedFooter,
                icon_url: config.settings.embedFooterIcon
            }
        };

        await message.reply({ embeds: [errorEmbed] }).catch(console.error);
    }
}