import { Events, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { config } from '../config/config.js';
import Vibrant from 'node-vibrant';
import { createCanvas } from 'canvas';

const COLOR_CHANNEL_ID = '1437116837228843168';

export default {
    name: Events.MessageCreate,
    
    async execute(message, client) {
        // Only work in color channel
        if (message.channel.id !== COLOR_CHANNEL_ID) return;
        if (message.author.bot) return;
        
        console.log(`🎨 [Color] Message in color channel from: ${message.author.tag}`);
        
        // Check for images
        const images = message.attachments.filter(att => 
            att.contentType && att.contentType.startsWith('image/')
        );

        if (images.size === 0) {
            console.log('⚠️ [Color] No images found');
            return;
        }

        const image = images.first();
        console.log(`🖼️ [Color] Image found: ${image.name}`);
        
        let processingMsg;
        
        try {
            await message.channel.sendTyping();

            // Send processing message
            processingMsg = await message.reply({
                embeds: [{
                    color: config.settings.defaultColor,
                    title: '🎨 Analyzing Colors...',
                    description: '✨ Extracting color palette from your image...',
                    thumbnail: { url: image.url },
                    footer: { 
                        text: `${config.settings.embedFooter} | Processing...`,
                        icon_url: config.settings.embedFooterIcon
                    }
                }]
            });

            console.log('🔍 [Color] Extracting colors with Vibrant...');

            // Extract colors using node-vibrant
            const palette = await Vibrant.from(image.url).getPalette();
            
            console.log('✅ [Color] Palette extracted');

            // Convert palette to array
            const colors = [];
            for (const key in palette) {
                if (palette[key]) {
                    const swatch = palette[key];
                    colors.push({
                        name: formatColorName(key),
                        hex: swatch.hex,
                        rgb: swatch.rgb,
                        population: swatch.population
                    });
                }
            }

            if (colors.length === 0) {
                throw new Error('No colors found in image');
            }

            // Sort by population
            colors.sort((a, b) => b.population - a.population);

            // Calculate percentages
            const totalPop = colors.reduce((sum, c) => sum + c.population, 0);
            colors.forEach(c => {
                c.percentage = Math.round((c.population / totalPop) * 100);
            });

            console.log(`📊 [Color] Found ${colors.length} colors`);

            // Take top 6 colors
            const topColors = colors.slice(0, 6);

            console.log('🖼️ [Color] Generating palette image...');

            // Generate image with Canvas
            const paletteBuffer = generatePaletteImage(topColors);
            const attachment = new AttachmentBuilder(paletteBuffer, { name: 'color-palette.png' });

            console.log('✅ [Color] Image generated successfully');

            // Create result embed
            const resultEmbed = new EmbedBuilder()
                .setColor(config.settings.defaultColor)
                .setAuthor({
                    name: `${message.author.username}'s Color Palette`,
                    iconURL: message.author.displayAvatarURL({ dynamic: true })
                })
                .setTitle('🎨 **Advanced Color Palette Analysis**')
                .setDescription(`✨ Successfully extracted **${topColors.length}** dominant colors from your image`)
                .setImage('attachment://color-palette.png');

            // Add color details
            let colorDetails = '```ansi\n';
            topColors.forEach((color, i) => {
                const bar = '█'.repeat(Math.floor(color.percentage / 5));
                const spaces = '░'.repeat(20 - Math.floor(color.percentage / 5));
                colorDetails += `[1;3${i + 2}m${(i + 1)}. ${color.name.padEnd(16)}[0m ${color.hex} ${bar}${spaces} ${color.percentage}%\n`;
            });
            colorDetails += '```';

            resultEmbed.addFields({
                name: '🎯 **Dominant Colors**',
                value: colorDetails,
                inline: false
            });

            // HEX codes quick copy
            const hexCodes = topColors.map(c => `\`${c.hex}\``).join(' • ');
            resultEmbed.addFields({
                name: '📋 **Quick Copy (HEX)**',
                value: hexCodes,
                inline: false
            });

            // RGB values
            const rgbValues = topColors.slice(0, 3).map(c => 
                `\`rgb(${Math.round(c.rgb[0])}, ${Math.round(c.rgb[1])}, ${Math.round(c.rgb[2])})\``
            ).join(' • ');
            
            resultEmbed.addFields({
                name: '🔢 **RGB Values (Top 3)**',
                value: rgbValues,
                inline: false
            });

            // Statistics
            const dominantColor = topColors[0];
            resultEmbed.addFields({
                name: '📊 **Palette Info**',
                value: [
                    `**Total Colors:** ${topColors.length}`,
                    `**Dominant:** ${dominantColor.name} (${dominantColor.percentage}%)`,
                    `**Brightness:** ${getBrightnessLevel(dominantColor.rgb)}`
                ].join('\n'),
                inline: false
            });

            resultEmbed.setFooter({
                text: `${config.settings.embedFooter} | AI Color Analysis`,
                icon_url: config.settings.embedFooterIcon
            });
            resultEmbed.setTimestamp();

            // Update message with result
            await processingMsg.edit({ 
                embeds: [resultEmbed],
                files: [attachment]
            });

            console.log('✅ [Color] Complete! Message updated successfully');

        } catch (error) {
            console.error('❌ [Color] Error:', error.message);
            console.error(error.stack);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(config.settings.errorColor)
                .setTitle('❌ Extraction Failed')
                .setDescription(`Could not analyze colors.\n\n**Error:** ${error.message}`)
                .addFields({
                    name: '💡 Tips',
                    value: '• Make sure image is accessible\n• Try PNG or JPG format\n• Image should be under 8MB',
                    inline: false
                })
                .setFooter({
                    text: config.settings.embedFooter,
                    icon_url: config.settings.embedFooterIcon
                });

            if (processingMsg) {
                await processingMsg.edit({ embeds: [errorEmbed] }).catch(() => {});
            } else {
                await message.reply({ embeds: [errorEmbed] }).catch(() => {});
            }
        }
    }
};

// Generate palette image using Canvas
function generatePaletteImage(colors) {
    const width = 800;
    const height = 600;
    const barHeight = Math.floor(height / colors.length);

    console.log(`🎨 [Canvas] Creating ${width}x${height} canvas with ${colors.length} colors`);

    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw each color bar
    colors.forEach((color, index) => {
        const y = index * barHeight;

        // Fill color bar
        ctx.fillStyle = color.hex;
        ctx.fillRect(0, y, width, barHeight);

        // Calculate text color based on brightness
        const brightness = getBrightness(color.rgb);
        const textColor = brightness > 128 ? '#000000' : '#FFFFFF';

        // Set text properties
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        const textY = y + barHeight / 2;

        // Draw color name (left)
        ctx.font = 'bold 28px Arial';
        ctx.fillText(color.name, 30, textY);

        // Draw HEX code (center-left)
        ctx.font = 'bold 26px monospace';
        ctx.fillText(color.hex.toUpperCase(), 280, textY);

        // Draw RGB (center-right)
        ctx.font = '24px monospace';
        const rgbText = `RGB(${Math.round(color.rgb[0])}, ${Math.round(color.rgb[1])}, ${Math.round(color.rgb[2])})`;
        ctx.fillText(rgbText, 480, textY);

        // Draw percentage (right)
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${color.percentage}%`, width - 30, textY);
        ctx.textAlign = 'left';
    });

    console.log('✅ [Canvas] Image created, converting to buffer');

    // Return PNG buffer
    return canvas.toBuffer('image/png');
}

// Helper functions
function formatColorName(name) {
    const names = {
        'Vibrant': '⭐ Vibrant',
        'DarkVibrant': '🌑 Dark Vibrant',
        'LightVibrant': '☀️ Light Vibrant',
        'Muted': '🎨 Muted',
        'DarkMuted': '🌙 Dark Muted',
        'LightMuted': '💫 Light Muted'
    };
    return names[name] || name;
}

function getBrightness(rgb) {
    return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
}

function getBrightnessLevel(rgb) {
    const brightness = getBrightness(rgb);
    if (brightness > 200) return 'Very Bright ☀️';
    if (brightness > 150) return 'Bright 💡';
    if (brightness > 100) return 'Medium 🌤️';
    if (brightness > 50) return 'Dark 🌙';
    return 'Very Dark 🌑';
}