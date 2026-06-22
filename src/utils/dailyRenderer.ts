import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { MultipleChoiceQuestion } from '../interfaces';
import { BRAND_COLOR, mcButtonId, POINTS_PER_CORRECT_ANSWER } from '../constants';
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
  const position = `Pergunta ${index + 1}/${total}`;
  const embed = new EmbedBuilder().setColor(BRAND_COLOR).setTitle(`📝 ${position}`);

  const lines = question.options.map((opt, i) => `**${LETTERS[i]})** ${opt}`);
  embed.setDescription(`${question.question}\n\n${lines.join('\n')}`);
  embed.setFooter({ text: 'Clique na opção correta abaixo.' });

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
    embed
      .setTitle('✅ Acertou!')
      .setDescription(`Mandou bem! +${POINTS_PER_CORRECT_ANSWER} pontos garantidos.`);
  } else {
    embed
      .setTitle('❌ Quase lá')
      .setDescription(`A resposta correta era:\n> **${outcome.correctAnswer}**`);
  }
  return embed;
}

/** Builds the final summary embed shown when the daily challenge is finished. */
export function renderSummary(outcome: SubmitResult): EmbedBuilder {
  const completion = outcome.completion;
  const correct = completion
    ? completion.pointsEarned / POINTS_PER_CORRECT_ANSWER
    : outcome.totalQuestions;
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('🎉 Desafio diário concluído!');

  const lines: string[] = [
    `🎯 **Acertos:** ${correct}/${outcome.totalQuestions}`,
    `🏅 **Pontos ganhos:** +${completion?.pointsEarned ?? 0}`,
  ];

  if (completion) {
    const streak = completion.streak;
    lines.push(`🔥 **Ofensiva atual:** ${streak.currentStreak} dia(s)`);
    if (streak.isNewBest) lines.push('🏆 **Novo recorde pessoal de ofensiva!**');
    if (streak.wasReset)
      lines.push('⚠️ Sua ofensiva tinha zerado — jogue todo dia para mantê-la!');
  }

  lines.push('\nVolte amanhã para manter sua ofensiva viva! 🔥');
  embed.setDescription(lines.join('\n'));
  return embed;
}
