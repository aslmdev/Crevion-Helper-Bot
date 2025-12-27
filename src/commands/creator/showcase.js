// src/commands/creator/showcase.js

import { SlashCommandBuilder } from 'discord.js';
import { PermissionLevels } from '../../utils/permissions.js';
import { getConfig } from '../../models/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('showcase')
        .setDescription('🚧 Feature under development - Coming soon!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('code')
                .setDescription('Share a code snippet (Coming Soon)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('project')
                .setDescription('Share a project (Coming Soon)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('saved-codes')
                .setDescription('View your saved code snippets (Coming Soon)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('saved-projects')
                .setDescription('View your saved projects (Coming Soon)')
        ),

    permission: PermissionLevels.HELPER,

    async execute(interaction, client) {
        const dbConfig = await getConfig();
        
        const funMessages = [
            {
                title: '🚧 Feature Under Development'
            }
        ];
        
        const message = funMessages[Math.floor(Math.random() * funMessages.length)];
        
        const warningColor = parseInt(dbConfig?.embedSettings?.warningColor?.replace('#', '') || 'FEE75C', 16);

        await interaction.reply({
            embeds: [{
                color: warningColor,
                title: message.title,
                description: message.description,
                fields: message.fields,
                thumbnail: { url: dbConfig?.embedSettings?.thumbnail },
                footer: {
                    text: `${dbConfig?.embedSettings?.footer} | نشكرك على صبرك ❤️`,
                    icon_url: dbConfig?.embedSettings?.footerIcon
                },
                timestamp: new Date()
            }],
            ephemeral: true
        });
    }
};