import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { User } from '@prisma/client';
import { Command } from '../interfaces';
import { userService } from '../services';
import { BRAND_COLOR, RANKING_SIZE, RANK_LABELS } from '../constants';

/** Neutralize Discord markdown in usernames. */
function escape(text: string): string {
  return text.replace(/[*_~`>|]/g, '\\$&');
}

/** One leaderboard line for a top user, with their global stats. */
function formatRow(user: User, index: number): string {
  const stats = userService.buildProfile(user);
  const label = RANK_LABELS[index] ?? `#${index + 1}`;
  return [
    `${label}  **${escape(stats.username)}**`,
    `> 🏅 ${stats.points} pts · 🔥 ${stats.currentStreak} dia(s) · 🎯 ${stats.accuracy}% de acerto`,
  ].join('\n');
}

/**
 * /ranking_global — shows the cross-server Top 5 (every player, all servers)
 * with each player's stats, plus the caller's own stats and global position.
 * Ephemeral so it never clutters the channel.
 */
export const rankingGlobalCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ranking_global')
    .setDescription('Veja o ranking global de todos os servidores e sua posição.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const me = await userService.ensureUser(
      interaction.user.id,
      interaction.user.username,
    );

    const [top, rank] = await Promise.all([
      userService.getLeaderboard(RANKING_SIZE),
      userService.getRank(me),
    ]);

    const myStats = userService.buildProfile(me);
    const myPosition =
      myStats.points > 0 ? `#${rank.position} de ${rank.total}` : 'Sem ranking';

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle('🌍 Ranking Global — Top 5')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({
        text: 'Pontuação somada de todos os servidores. Jogue todo dia para subir! 🚀',
      });

    embed.setDescription(
      top.length === 0
        ? 'Ninguém jogou ainda. Seja o primeiro a pontuar! 🚀'
        : top.map((user, i) => formatRow(user, i)).join('\n\n'),
    );

    embed.addFields({
      name: '📊 Suas estatísticas',
      value: [
        `📍 Posição global: **${myPosition}**`,
        `🏅 Pontos: **${myStats.points}** · 🔥 Ofensiva: **${myStats.currentStreak} dia(s)** · 🏆 Recorde: **${myStats.bestStreak}**`,
        `❓ Respondidas: **${myStats.totalQuestionsAnswered}** · ✅ Corretas: **${myStats.totalCorrectAnswers}** · 🎯 Precisão: **${myStats.accuracy}%**`,
      ].join('\n'),
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
