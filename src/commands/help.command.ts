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
            '`/daily` — Answer today’s 5 questions (private).',
            '`/profile` — See your points, streak and accuracy.',
            '`/ranking` — View the global Top 5.',
            '`/help` — Show this message.',
          ].join('\n'),
        },
        {
          name: '🎯 How it works',
          value: [
            `• Everyone gets the **same 5 questions** each day.`,
            `• You can answer **once per day**.`,
            `• Each correct answer = **${POINTS_PER_CORRECT_ANSWER} points** (max **${MAX_DAILY_POINTS}**/day).`,
            '• Answers are **private** (ephemeral) — no one sees your responses.',
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
      .setFooter({ text: 'Start now with /daily 🚀' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
