import {
  ButtonInteraction,
  Client,
  EmbedBuilder,
  Interaction,
  MessageFlags,
} from 'discord.js';
import { CUSTOM_IDS, parseMcButtonId } from '../constants';
import { dailyService, rankingService, roleService, userService } from '../services';
import type { SubmitResult } from '../services';
import {
  renderFeedback,
  renderQuestion,
  renderSummary,
} from '../utils/dailyRenderer';
import { createLogger } from '../utils/logger';

const log = createLogger('DailyInteraction');

const SESSION_EXPIRED =
  '⌛ Sua sessão expirou ou não foi encontrada. Clique em **Começar o desafio de hoje** no canal de perguntas para recomeçar.';
const ALREADY_DONE =
  '✅ Você já completou o desafio de hoje!\n' +
  'Volte amanhã para manter sua ofensiva 🔥 viva.';
const NO_QUESTIONS =
  '⚠️ Nenhuma pergunta disponível no momento. Tente novamente mais tarde.';

/** True if this interaction belongs to the daily flow (a button). */
export function isDailyComponent(interaction: Interaction): boolean {
  if (!interaction.isButton()) return false;
  return (
    interaction.customId === CUSTOM_IDS.daily.start ||
    parseMcButtonId(interaction.customId) !== null
  );
}

/** Routes a daily button: either the channel-panel "start" or an MC answer. */
export async function handleDailyButton(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId === CUSTOM_IDS.daily.start) {
    await startSession(interaction);
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

  const outcome = await dailyService.submitMultipleChoice(interaction.user.id, optionIndex);
  await advanceAndRespond(interaction, outcome);
}

/**
 * Starts a fresh daily run for the user. Triggered by the persistent panel
 * button in the daily channel; the whole quiz then plays out in this user's
 * private (ephemeral) message thread.
 */
async function startSession(interaction: ButtonInteraction): Promise<void> {
  const discordId = interaction.user.id;
  const user = await userService.ensureUser(discordId, interaction.user.username);

  if (dailyService.hasCompletedToday(user)) {
    await interaction.reply({ content: ALREADY_DONE, flags: MessageFlags.Ephemeral });
    return;
  }

  // Reset any stale in-memory session and start fresh.
  dailyService.endSession(discordId);
  const session = await dailyService.startSession(user, discordId, interaction.guildId);

  if (session.questions.length === 0) {
    await interaction.reply({ content: NO_QUESTIONS, flags: MessageFlags.Ephemeral });
    log.error('Daily session started with zero questions.');
    return;
  }

  const view = renderQuestion(session.questions[0], 0, session.questions.length);
  await interaction.reply({
    embeds: view.embeds,
    components: view.components,
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Edits the original ephemeral message to show feedback plus either the next
 * question or the final summary, then runs post-completion side effects.
 */
async function advanceAndRespond(
  interaction: ButtonInteraction,
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

/** Edits the user's ephemeral message in place with the new embeds/buttons. */
async function updateMessage(
  interaction: ButtonInteraction,
  embeds: EmbedBuilder[],
  components: ReturnType<typeof renderQuestion>['components'],
): Promise<void> {
  await interaction.update({ embeds, components });
}

/** Grants milestone roles and refreshes the ranking channel after completion. */
async function runCompletionSideEffects(
  interaction: ButtonInteraction,
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
          content: `🎖️ Você ganhou o cargo **${granted}** pela sua ofensiva!`,
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
