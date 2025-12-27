// src/events/backgroundRemover.js

import { Events, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { config } from '../config/config.js';
import fetch from 'node-fetch';

const BG_REMOVE_CHANNEL_ID = '1437119020754276452';

// You'll need to get a free API key from remove.bg
const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY || '';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Only process messages in the background removal channel
        if (message.channel.id !== BG_REMOVE_CHANNEL_ID) return;
        if (message.author.bot) return;
        
        // Check if message has image attachments
        const images = message.attachments.filter(att => 
            att.contentType?.startsWith('image/')
        );

        if (images.size === 0) return;

        // Process first image only
        const image = images.first();
        
        try {
            await message.channel.sendTyping();

            // Check if API key is configured
            if (!REMOVE_BG_API_KEY) {
                return await message.reply({
                    embeds: [{
                        color: config.settings.warningColor,
                        title: '⚠️ Service Not Configured',
                        description: 'Background removal service is not configured. Please contact the bot owner.',
                        footer: {
                            text: config.settings.embedFooter,
                            icon_url: config.settings.embedFooterIcon
                        }
                    }]
                });
            }

            const processingEmbed = new EmbedBuilder()
                .setColor(config.settings.defaultColor)
                .setTitle('🔄 Processing Image...')
                .setDescription('Removing background with AI precision. This may take a few seconds...')
                .setThumbnail(image.url)
                .setFooter({
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                });

            const statusMsg = await message.reply({ embeds: [processingEmbed] });

            // Call remove.bg API
            const formData = new FormData();
            formData.append('image_url', image.url);
            formData.append('size', 'auto');

            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: {
                    'X-Api-Key': REMOVE_BG_API_KEY,
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            const attachment = new AttachmentBuilder(Buffer.from(buffer), {
                name: 'no-background.png'
            });

            const resultEmbed = new EmbedBuilder()
                .setColor(config.settings.successColor)
                .setAuthor({
                    name: `Background Removed`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTitle('✨ Background Removed Successfully')
                .setDescription('Your image is ready! The background has been removed with AI precision.')
                .addFields(
                    { name: '📥 Original', value: `[View Original](${image.url})`, inline: true },
                    { name: '📤 Result', value: 'See attachment below', inline: true }
                )
                .setImage('attachment://no-background.png')
                .setFooter({
                    text: `${config.settings.embedFooter} | Processed for ${message.author.tag}`,
                    icon_url: config.settings.embedFooterIcon
                })
                .setTimestamp();

            await statusMsg.edit({ embeds: [resultEmbed], files: [attachment] });

        } catch (error) {
            console.error('❌ Background removal error:', error);
            
            let errorMsg = 'Failed to remove background. Please try again with a different image.';
            
            if (error.message.includes('402')) {
                errorMsg = 'API quota exceeded. Please try again later.';
            } else if (error.message.includes('400')) {
                errorMsg = 'Invalid image format. Please use PNG, JPG, or WebP.';
            }

            await message.reply({
                embeds: [{
                    color: config.settings.errorColor,
                    title: '❌ Processing Failed',
                    description: errorMsg,
                    footer: {
                        text: config.settings.embedFooter,
                        icon_url: config.settings.embedFooterIcon
                    }
                }]
            });
        }
    }
};