// src/events/messageCreate.js

import { Events, AttachmentBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { getConfig, incrementCommandCount, incrementErrorCount } from '../models/index.js';
import { hasPermission, getPermissionErrorMessage, getCommandRequiredLevel, getUserPermissionLevel, PermissionLevels } from '../utils/permissions.js';
import { autoReply } from '../utils/autoreply.js';
import { autoLine } from '../utils/autoline.js';

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

    // Get config ONCE
    const dbConfig = client.dbConfig || await getConfig();
    const lineUrl = dbConfig?.lineConfig?.url;

    // ═══════════════════════════════════════════════════════════════
    // ⚡ PRIORITY 1: Manual line command "خط" or "line"
    // ═══════════════════════════════════════════════════════════════
    const content = message.content.trim().toLowerCase();
    if (content === "خط" || content === "line") {

        // ✅ CHECK LINE PERMISSION - Uses lineAccess from database
        const member = await message.guild.members.fetch(message.author.id);

        const hasAccess = await hasLineAccessPermission(member, dbConfig);

        if (!hasAccess) {
            // Silently ignore if no permission (no error message)
            console.log(`📏 ❌ User ${message.author.tag} tried to use line but has no permission`);
            return;
        }

        console.log(`📏 ✅ User ${message.author.tag} has line permission, checking line URL...`);

        // ✅ Check if line URL exists
        if (!lineUrl || lineUrl === null || lineUrl === 'null' || lineUrl === '') {
            console.log(`📏 ⚠️ No line URL configured`);
            return await message.reply({
                embeds: [{
                    color: 0xFEE75C,
                    title: '⚠️ لا يوجد خط',
                    description: 'لم يتم تعيين صورة الخط بعد.\n\nيرجى من الأونر استخدام `/line set <url>`',
                    footer: { text: 'Crévion' }
                }],
                allowedMentions: { repliedUser: false }
            });
        }

        try {
            console.log(`📏 🔄 Fetching line from: ${lineUrl}`);

            // ✅ ENHANCED ERROR HANDLING with longer timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds

            const response = await fetch(lineUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                redirect: 'follow' // Follow redirects
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP_${response.status}`);
            }

            // ✅ Check content type (but allow Discord CDN)
            const contentType = response.headers.get('content-type');
            const isDiscordCDN = lineUrl.includes('cdn.discordapp.com') ||
                lineUrl.includes('media.discordapp.net') ||
                lineUrl.includes('discord.com');

            if (contentType && !contentType.startsWith('image/') && !isDiscordCDN) {
                console.error(`📏 ❌ Invalid content type: ${contentType}`);
                throw new Error('NOT_IMAGE');
            }

            const buffer = await response.arrayBuffer();

            if (buffer.byteLength === 0) {
                console.error(`📏 ❌ Empty image data`);
                throw new Error('EMPTY_IMAGE');
            }

            if (buffer.byteLength > 8 * 1024 * 1024) {
                console.error(`📏 ❌ Image too large: ${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
                throw new Error('IMAGE_TOO_LARGE');
            }

            const attachment = new AttachmentBuilder(Buffer.from(buffer), { name: 'line.png' });

            // Delete user message (optional)
            await message.delete().catch(() => { });

            // Send line
            await message.channel.send({ files: [attachment] });

            console.log(`📏 ✅ Line sent successfully by ${message.author.tag}`);
            return;

        } catch (err) {
            console.error(`📏 ❌ Line fetch error for ${message.author.tag}:`, err.message);

            let errorMsg = '❌ فشل تحميل صورة الخط!';
            let errorDetails = '';

            if (err.name === 'AbortError') {
                errorMsg = '❌ انتهت مهلة تحميل الصورة';
                errorDetails = 'الصورة بطيئة جداً في التحميل (أكثر من 15 ثانية)';
            } else if (err.message.includes('HTTP_404')) {
                errorMsg = '❌ الصورة غير موجودة (404)';
                errorDetails = 'الرابط المحفوظ لم يعد يعمل. الصورة قد تكون تم حذفها أو الرابط غير صحيح.';
            } else if (err.message.includes('HTTP_403')) {
                errorMsg = '❌ ممنوع الوصول للصورة (403)';
                errorDetails = 'السيرفر يرفض الوصول للصورة. حاول رفع الصورة على Discord.';
            } else if (err.message.includes('HTTP_')) {
                errorMsg = `❌ خطأ في تحميل الصورة (${err.message.replace('HTTP_', '')})`;
                errorDetails = 'السيرفر أرجع خطأ. الرابط قد يكون غير صحيح.';
            } else if (err.message === 'NOT_IMAGE') {
                errorMsg = '❌ الرابط لا يشير إلى صورة';
                errorDetails = 'الرابط المحفوظ لا يشير لصورة صحيحة.';
            } else if (err.message === 'EMPTY_IMAGE') {
                errorMsg = '❌ الصورة فارغة';
                errorDetails = 'الملف المحفوظ فارغ أو تالف.';
            } else if (err.message === 'IMAGE_TOO_LARGE') {
                errorMsg = '❌ الصورة كبيرة جداً';
                errorDetails = 'حجم الصورة أكثر من 8MB. استخدم صورة أصغر.';
            } else if (err.message.includes('ENOTFOUND')) {
                errorMsg = '❌ الرابط غير موجود';
                errorDetails = 'العنوان المحفوظ غير صحيح أو لم يعد موجوداً.';
            } else if (err.message.includes('ECONNREFUSED')) {
                errorMsg = '❌ فشل الاتصال بالسيرفر';
                errorDetails = 'السيرفر رفض الاتصال. حاول لاحقاً.';
            }

            // Only show error to user if they're owner (for debugging)
            const { isOwner } = await import('../utils/permissions.js');
            const isUserOwner = await isOwner(message.author.id);

            if (isUserOwner) {
                return await message.reply({
                    embeds: [{
                        color: 0xED4245,
                        title: errorMsg,
                        description: `${errorDetails}\n\n**الحل:**\n• تأكد من أن الرابط يعمل في المتصفح\n• استخدم \`/line set (url)\` لتحديث الرابط\n• جرب رفع الصورة على Discord وانسخ الرابط\n\n**الرابط الحالي:**\n\`${lineUrl}\``,
                        footer: { text: 'Crévion • هذه الرسالة تظهر للأونرز فقط' }
                    }],
                    allowedMentions: { repliedUser: false }
                });
            }

            // For non-owners, silently fail
            console.log(`📏 ℹ️ Silently failed for non-owner user`);
            return;
        }


        // ═══════════════════════════════════════════════════════════════
        // 🎨 Auto Line System (after every message in enabled channels)
        // ═══════════════════════════════════════════════════════════════
        if (autoLine.isEnabled(message.channel.id) && lineUrl && lineUrl !== 'null') {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(lineUrl, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                clearTimeout(timeout);

                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    if (buffer.byteLength > 0 && buffer.byteLength < 8 * 1024 * 1024) {
                        const attachment = new AttachmentBuilder(Buffer.from(buffer), { name: 'line.png' });
                        await message.channel.send({ files: [attachment] });
                        autoLine.incrementCount(message.channel.id);
                    }
                }
            } catch (err) {
                // Silent fail for auto-line
                console.error('❌ Auto line error:', err.message);
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // 🤖 Auto Reply System
        // ═══════════════════════════════════════════════════════════════
        const replyData = autoReply.check(message);
        if (replyData) {
            try {
                let responseContent = replyData.response;

                if (replyData.mention) {
                    responseContent = `${message.author} ${responseContent}`;
                }

                if (replyData.reply) {
                    await message.reply({
                        content: responseContent,
                        allowedMentions: { repliedUser: false }
                    });
                } else {
                    await message.channel.send(responseContent);
                }
            } catch (err) {
                console.error('❌ Auto reply error:', err.message);
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // 🔧 Prefix Commands Handler
        // ═══════════════════════════════════════════════════════════════
        const prefix = dbConfig?.prefix || '-';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = client.prefixCommands.get(commandName);
        if (!command) return;

        try {
            // Permission check
            if (command.permission !== undefined) {
                const member = await message.guild.members.fetch(message.author.id);

                if (!await hasPermission(member, commandName, command.permission)) {
                    const requiredLevel = await getCommandRequiredLevel(commandName, command.permission);
                    const errorMsg = getPermissionErrorMessage(requiredLevel);
                    return await message.reply({
                        ...errorMsg,
                        allowedMentions: { repliedUser: false }
                    });
                }
            }

            // Execute command
            await command.executePrefix(message, args, client);
            await incrementCommandCount();

            console.log(`📝 ${message.author.tag} used ${prefix}${commandName}`);

        } catch (err) {
            console.error(`❌ Error in ${commandName}:`, err);
            await incrementErrorCount();

            await message.reply({
                embeds: [{
                    color: 0xED4245,
                    title: '❌ Error',
                    description: 'Command failed. Try again.',
                    footer: { text: 'Crévion' }
                }],
                allowedMentions: { repliedUser: false }
            }).catch(console.error);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CHECK LINE ACCESS PERMISSION
    // ═══════════════════════════════════════════════════════════════

    async function hasLineAccessPermission(member, dbConfig) {
        // 1️⃣ PRIORITY: Check if user is Owner (ALWAYS allow)
        const owners = dbConfig?.permissions?.owners || [];
        const userId = member.id || member.user?.id;

        if (owners.includes(userId)) {
            console.log(`✅ ${member.user.tag} is Owner - Line access granted`);
            return true;
        }

        // 2️⃣ Check lineAccess roles from database
        const lineAccessRoles = dbConfig?.permissions?.lineAccess || [];

        if (lineAccessRoles.length === 0) {
            // If NO lineAccess configured, NOBODY except owners can use
            console.log(`❌ ${member.user.tag} - No lineAccess roles configured`);
            return false;
        }

        // Check if user has any of the lineAccess roles
        const hasAccessRole = lineAccessRoles.some(roleId => {
            const hasRole = member.roles.cache.has(roleId);
            if (hasRole) {
                const role = member.roles.cache.get(roleId);
                console.log(`✅ ${member.user.tag} has line access role: ${role.name}`);
            }
            return hasRole;
        });

        if (!hasAccessRole) {
            console.log(`❌ ${member.user.tag} - No line access roles`);
        }

        return hasAccessRole;
    }
}