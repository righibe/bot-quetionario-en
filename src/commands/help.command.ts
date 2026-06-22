import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../interfaces';
import {
  BRAND_COLOR,
  MAX_DAILY_POINTS,
  POINTS_PER_CORRECT_ANSWER,
  STREAK_MILESTONES,
} from '../constants';

/**
 * /help — lists available commands and explains the game rules.
 */
export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Veja como o English Streak funciona e os comandos.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const milestones = STREAK_MILESTONES.map((m) => `\`${m}\``).join(', ');

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle('🔥 English Streak — Ajuda')
      .setDescription(
        'Aprenda **inglês técnico** para desenvolvimento de software, um dia de cada vez!',
      )
      .addFields(
        {
          name: '📋 Comandos',
          value: [
            '`/profile_duolingo` — Veja suas estatísticas e posição no ranking (privado).',
            '`/help` — Mostra esta mensagem.',
            '_O Top 5 global fica como mensagem permanente no canal de ranking._',
          ].join('\n'),
        },
        {
          name: '🎯 Como funciona',
          value: [
            '🟢 Vá ao **canal de perguntas** e clique em **▶️ Começar o desafio de hoje**.',
            '🔘 Basta **clicar na opção correta** — tudo é múltipla escolha (sem digitar).',
            '📅 Todo mundo recebe as **mesmas 5 perguntas** por dia, **uma vez ao dia**.',
            `🏅 Cada acerto vale **${POINTS_PER_CORRECT_ANSWER} pontos** (máx. **${MAX_DAILY_POINTS}**/dia).`,
            '🔒 Tudo é **privado** (efêmero) — ninguém vê suas respostas.',
          ].join('\n'),
        },
        {
          name: '🔥 Ofensivas & cargos',
          value: [
            'Responda todo dia para aumentar sua ofensiva. Faltou um dia, ela zera.',
            `Alcance um marco (${milestones} dias) e ganhe um cargo 🔥 automático!`,
          ].join('\n'),
        },
      )
      .setFooter({ text: 'Comece agora pelo botão no canal de perguntas 🚀' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
