import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../interfaces';
import { rankingService, userService } from '../services';

/**
 * /ranking — shows the global Top 5 plus the caller's own position.
 *
 * The reply is ephemeral (private), so the ranking channel keeps a single,
 * permanent Top-5 message and never gets polluted by command output.
 */
export const rankingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('See the global Top 5 and your own position (private).'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = await userService.ensureUser(
      interaction.user.id,
      interaction.user.username,
    );

    const embed = await rankingService.buildEmbed();
    const { position, total } = await userService.getRank(user);

    embed.addFields({
      name: '📍 Your position',
      value:
        user.points > 0
          ? `**#${position}** of ${total} • 🏅 ${user.points} pts • 🔥 ${user.currentStreak} day streak`
          : 'You haven’t scored yet — start a challenge in the daily channel! 🚀',
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
