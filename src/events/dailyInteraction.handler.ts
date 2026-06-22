import {
  ButtonInteraction,
  Client,
  EmbedBuilder,
  Interaction,
  MessageFlags,
  ModalSubmitInteraction,
} from 'discord.js';
import { CUSTOM_IDS, parseMcButtonId } from '../constants';
import { dailyService, rankingService, roleService } from '../services';
import type { SubmitResult } from '../services';
import { isMultipleChoice } from '../interfaces';
import {
  buildTextModal,
  renderFeedback,
  renderQuestion,
  renderSummary,
} from '../utils/dailyRenderer';
import { createLogger } from '../utils/logger';

const log = createLogger('DailyInteraction');

const SESSION_EXPIRED =
  '⌛ Your daily session expired or was not found. Start again with `/daily`.';

/** True if this interaction belongs to the daily flow (button or modal). */
export function isDailyComponent(interaction: Interaction): boolean {
  if (interaction.isButton()) {
    return (
      interaction.customId === CUSTOM_IDS.daily.openTextModal ||
      parseMcButtonId(interaction.customId) !== null
    );
  }
  if (interaction.isModalSubmit()) {
    return interaction.customId === CUSTOM_IDS.daily.textModal;
  }
  return false;
}

/** Routes a daily button: either a multiple-choice answer or "open modal". */
export async function handleDailyButton(interaction: ButtonInteraction): Promise<void> {
  // Open the free-text modal.
  if (interaction.customId === CUSTOM_IDS.daily.openTextModal) {
    const question = dailyService.currentQuestion(interaction.user.id);
    if (!question) {
      await interaction.reply({ content: SESSION_EXPIRED, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.showModal(buildTextModal(question));
    return;
  }

  // Multiple-choice answer.
  const optionIndex = parseMcButtonId(interaction.customId);
  if (optionIndex === null) return;

  const current = dailyService.currentQuestion(interaction.user.id);
  if (!current) {
    await interaction.reply({ content: SESSION_EXPIRED, flags: MessageFlags.Ephemeral });
    return;
  }
  // Guard against a button click that doesn't match the current question type.
  if (!isMultipleChoice(current)) {
    await interaction.reply({
      content: 'This question expects a typed answer. Use the answer button.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const outcome = await dailyService.submitMultipleChoice(interaction.user.id, optionIndex);
  await advanceAndRespond(interaction, outcome);
}

/** Handles the submitted free-text modal. */
export async function handleDailyModal(interaction: ModalSubmitInteraction): Promise<void> {
  const current = dailyService.currentQuestion(interaction.user.id);
  if (!current) {
    await interaction.reply({ content: SESSION_EXPIRED, flags: MessageFlags.Ephemeral });
    return;
  }

  const value = interaction.fields.getTextInputValue(CUSTOM_IDS.daily.textModalInput);
  const outcome = await dailyService.submitText(interaction.user.id, value);
  await advanceAndRespond(interaction, outcome);
}

/**
 * Edits the original ephemeral message to show feedback plus either the next
 * question or the final summary, then runs post-completion side effects.
 */
async function advanceAndRespond(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  outcome: SubmitResult,
): Promise<void> {
  const feedback = renderFeedback(outcome);

  if (!outcome.finished && outcome.nextQuestion) {
    const next = renderQuestion(
      outcome.nextQuestion,
      outcome.questionNumber,
      outcome.totalQuestions,
    );
    await updateMessage(interaction, [feedback, ...next.embeds], next.components);
    return;
  }

  // Finished.
  const summary = renderSummary(outcome);
  await updateMessage(interaction, [feedback, summary], []);

  // Best-effort side effects; never block or break the user-facing flow.
  if (outcome.completion) {
    void runCompletionSideEffects(interaction, outcome).catch((err) =>
      log.error('Completion side effects failed.', err),
    );
  }
}

/** Unified message update for button & modal interactions. */
async function updateMessage(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  embeds: EmbedBuilder[],
  components: ReturnType<typeof renderQuestion>['components'],
): Promise<void> {
  if (interaction.isButton()) {
    await interaction.update({ embeds, components });
    return;
  }
  // Modal submitted from a message component supports update().
  if (interaction.isFromMessage()) {
    await interaction.update({ embeds, components });
  } else {
    await interaction.reply({ embeds, flags: MessageFlags.Ephemeral });
  }
}

/** Grants milestone roles and refreshes the ranking channel after completion. */
async function runCompletionSideEffects(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  outcome: SubmitResult,
): Promise<void> {
  const completion = outcome.completion;
  if (!completion) return;

  // Milestone role — only when invoked from inside a guild.
  // A single REST member fetch (no GUILD_MEMBERS intent needed) gives us a
  // fully-typed GuildMember with its current roles.
  if (interaction.guild) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const granted = await roleService.syncMemberRole(
        member,
        completion.streak.currentStreak,
      );
      if (granted) {
        await interaction.followUp({
          content: `🎖️ You earned the **${granted}** role for your streak!`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      log.error('Failed to sync milestone role.', err);
    }
  }

  // Refresh the public ranking message.
  await refreshRanking(interaction.client);
}

async function refreshRanking(client: Client): Promise<void> {
  try {
    await rankingService.updateRankingChannel(client);
  } catch (err) {
    log.error('Failed to refresh ranking channel.', err);
  }
}
