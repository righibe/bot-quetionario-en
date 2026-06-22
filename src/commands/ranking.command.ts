import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../interfaces';
import { rankingService } from '../services';

/**
 * /ranking — shows the global Top 5 leaderboard.
 */
export const rankingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Show the global Top 5 leaderboard.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = await rankingService.buildEmbed();
    await interaction.reply({ embeds: [embed] });
  },
};
