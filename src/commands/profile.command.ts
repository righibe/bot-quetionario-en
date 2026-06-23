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
    .setDescription('Veja suas estatísticas e posição no ranking.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = await userService.ensureUser(
      interaction.user.id,
      interaction.user.username,
    );
    const stats = userService.buildProfile(user);

    const { position, total } = await userService.getRank(user);
    const globalRankValue =
      stats.points > 0 ? `#${position} de ${total}` : 'Sem ranking';

    // Position within this server (based on points earned playing from here).
    // Only meaningful when invoked inside a guild.
    let serverRankValue = 'Use o comando em um servidor';
    if (interaction.guildId) {
      const guildRank = await userService.getGuildRank(
        interaction.guildId,
        user.id,
      );
      serverRankValue =
        guildRank.position > 0
          ? `#${guildRank.position} de ${guildRank.total} · ${guildRank.points} pts`
          : 'Sem ranking neste servidor';
    }

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(`📊 Perfil — ${stats.username}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '🏠 Posição no servidor', value: serverRankValue, inline: true },
        { name: '🌍 Posição global', value: globalRankValue, inline: true },
        { name: '🏅 Pontos (global)', value: `${stats.points}`, inline: true },
        { name: '🔥 Ofensiva atual', value: `${stats.currentStreak} dia(s)`, inline: true },
        { name: '🏆 Melhor ofensiva', value: `${stats.bestStreak} dia(s)`, inline: true },
        {
          name: '❓ Perguntas respondidas',
          value: `${stats.totalQuestionsAnswered}`,
          inline: true,
        },
        {
          name: '✅ Respostas corretas',
          value: `${stats.totalCorrectAnswers}`,
          inline: true,
        },
        { name: '🎯 Precisão', value: `${stats.accuracy}%`, inline: true },
      )
      .setFooter({ text: 'Continue praticando todo dia para subir no ranking!' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
