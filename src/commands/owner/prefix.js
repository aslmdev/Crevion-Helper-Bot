import { SlashCommandBuilder } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { config } from '../../config/config.js';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(__dirname, '..', '..', 'config', 'config.js');

export default {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Change bot prefix (Owner only)')
        .addStringOption(opt => opt
            .setName('new_prefix')
            .setDescription('New prefix (1-3 characters)')
            .setRequired(true)
            .setMaxLength(3)),

    permission: PermissionLevels.OWNER,

    async execute(interaction, client) {
        const newPrefix = interaction.options.getString('new_prefix');

        // Validate prefix
        if (newPrefix.length === 0 || newPrefix.length > 3) {
            return await interaction.reply({
                embeds: [{
                    color: config.settings.errorColor,
                    description: '❌ Prefix must be 1-3 characters long'
                }],
                ephemeral: true
            });
        }

        // Don't allow spaces or special Discord characters
        if (newPrefix.includes(' ') || newPrefix.includes('@') || newPrefix.includes('#')) {
            return await interaction.reply({
                embeds: [{
                    color: config.settings.errorColor,
                    description: '❌ Prefix cannot contain spaces, @ or #'
                }],
                ephemeral: true
            });
        }

        const oldPrefix = config.settings.prefix;

        // Update in memory
        config.settings.prefix = newPrefix;

        // Update config file
        try {
            let configContent = readFileSync(CONFIG_PATH, 'utf-8');
            
            // Replace the prefix line
            const prefixRegex = /prefix:\s*['"`].*?['"`]/;
            configContent = configContent.replace(prefixRegex, `prefix: '${newPrefix}'`);
            
            writeFileSync(CONFIG_PATH, configContent, 'utf-8');

            await interaction.reply({
                embeds: [{
                    color: config.settings.successColor,
                    title: '✅ Prefix Updated',
                    description: `Bot prefix has been changed successfully!`,
                    fields: [
                        { name: '📝 Old Prefix', value: `\`${oldPrefix}\``, inline: true },
                        { name: '✨ New Prefix', value: `\`${newPrefix}\``, inline: true }
                    ],
                    footer: {
                        text: `${config.settings.embedFooter} | Changed by ${interaction.user.tag}`,
                        icon_url: config.settings.embedFooterIcon
                    },
                    timestamp: new Date()
                }],
                ephemeral: true
            });
        } catch (error) {
            console.error('❌ Error updating config file:', error);
            await interaction.reply({
                embeds: [{
                    color: config.settings.errorColor,
                    description: '❌ Failed to save prefix to config file. Restart bot to revert.'
                }],
                ephemeral: true
            });
        }
    }
};