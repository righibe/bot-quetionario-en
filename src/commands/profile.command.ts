import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../interfaces';
import { userService } from '../services';
import { BRAND_COLOR } from '../constants';

/**
 * /profile_duolingo — shows the caller's personal stats and ranking position
 * (ephemeral, private).
 */
export const profileCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('profile_duolingo')
    .setDescription('View your English Streak stats and ranking position.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = await userService.ensureUser(
      interaction.user.id,
      interaction.user.username,
    );
    const stats = userService.buildProfile(user);
    const { position, total } = await userService.getRank(user);
    const rankValue =
      stats.points > 0 ? `#${position} of ${total}` : 'Unranked';

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(`📊 Profile — ${stats.username}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '📍 Ranking', value: rankValue, inline: true },
        { name: '🏅 Points', value: `${stats.points}`, inline: true },
        { name: '🔥 Current streak', value: `${stats.currentStreak} day(s)`, inline: true },
        { name: '🏆 Best streak', value: `${stats.bestStreak} day(s)`, inline: true },
        {
          name: '❓ Questions answered',
          value: `${stats.totalQuestionsAnswered}`,
          inline: true,
        },
        {
          name: '✅ Correct answers',
          value: `${stats.totalCorrectAnswers}`,
          inline: true,
        },
        { name: '🎯 Accuracy', value: `${stats.accuracy}%`, inline: true },
      )
      .setFooter({ text: 'Keep practicing daily to climb the ranking!' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
