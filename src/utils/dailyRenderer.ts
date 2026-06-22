import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { MultipleChoiceQuestion } from '../interfaces';
import { BRAND_COLOR, mcButtonId } from '../constants';
import type { SubmitResult } from '../services';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export interface RenderedQuestion {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
}

/**
 * Builds the ephemeral message (embed + buttons) for a single question.
 * Every question reaches this point already normalized to multiple choice, so
 * the user answers by clicking a lettered button — no modal involved.
 */
export function renderQuestion(
  question: MultipleChoiceQuestion,
  index: number,
  total: number,
): RenderedQuestion {
  const position = `Question ${index + 1}/${total}`;
  const embed = new EmbedBuilder().setColor(BRAND_COLOR).setTitle(`📝 ${position}`);

  const lines = question.options.map((opt, i) => `**${LETTERS[i]})** ${opt}`);
  embed.setDescription(`${question.question}\n\n${lines.join('\n')}`);
  embed.setFooter({ text: 'Choose the correct option below.' });

  const row = new ActionRowBuilder<ButtonBuilder>();
  question.options.forEach((_opt, i) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(mcButtonId(i))
        .setLabel(LETTERS[i] ?? String(i + 1))
        .setStyle(ButtonStyle.Primary),
    );
  });
  return { embeds: [embed], components: [row] };
}

/** Builds the per-answer feedback embed shown after each submission. */
export function renderFeedback(outcome: SubmitResult): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(outcome.isCorrect ? 0x2ecc71 : 0xe74c3c);

  if (outcome.isCorrect) {
    embed.setTitle('✅ Correct!').setDescription('Nice work. +20 points secured.');
  } else {
    embed
      .setTitle('❌ Not quite')
      .setDescription(`The correct answer was:\n> **${outcome.correctAnswer}**`);
  }
  return embed;
}

/** Builds the final summary embed shown when the daily challenge is finished. */
export function renderSummary(outcome: SubmitResult): EmbedBuilder {
  const completion = outcome.completion;
  const correct = completion
    ? completion.pointsEarned / 20
    : outcome.totalQuestions;
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('🎉 Daily challenge complete!');

  const lines: string[] = [
    `**Score:** ${correct}/${outcome.totalQuestions} correct`,
    `**Points earned:** +${completion?.pointsEarned ?? 0}`,
  ];

  if (completion) {
    const streak = completion.streak;
    lines.push(`**Current streak:** 🔥 ${streak.currentStreak} day(s)`);
    if (streak.isNewBest) lines.push('🏅 **New personal best streak!**');
    if (streak.wasReset) lines.push('⚠️ Your streak had reset — keep it going daily!');
  }

  lines.push('\nCome back tomorrow to keep your streak alive! 🔥');
  embed.setDescription(lines.join('\n'));
  return embed;
}
