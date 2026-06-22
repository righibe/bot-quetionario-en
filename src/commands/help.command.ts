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
    .setDescription('Learn how English Streak works and see all commands.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const milestones = STREAK_MILESTONES.map((m) => `\`${m}\``).join(', ');

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle('🔥 English Streak — Help')
      .setDescription(
        'Learn **technical English** for software development, one day at a time!',
      )
      .addFields(
        {
          name: '📋 Commands',
          value: [
            '`/profile` — See your stats and ranking position (private).',
            '`/ranking` — View the global Top 5 and your position (private).',
            '`/help` — Show this message.',
          ].join('\n'),
        },
        {
          name: '🎯 How it works',
          value: [
            '• Go to the **daily channel** and press **▶️ Start today’s challenge**.',
            '• Just **click the correct option** — every question is multiple choice (no typing).',
            `• Everyone gets the **same 5 questions** each day, **once per day**.`,
            `• Each correct answer = **${POINTS_PER_CORRECT_ANSWER} points** (max **${MAX_DAILY_POINTS}**/day).`,
            '• Everything is **private** (ephemeral) — no one sees your answers.',
          ].join('\n'),
        },
        {
          name: '🔥 Streaks & roles',
          value: [
            'Answer every day to grow your streak. Miss a day and it resets.',
            `Reach a milestone (${milestones} days) to earn an automatic 🔥 role!`,
          ].join('\n'),
        },
      )
      .setFooter({ text: 'Start now from the daily channel button 🚀' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
