import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  MessageFlags,
  ModalSubmitInteraction,
  RepliableInteraction,
} from 'discord.js';
import { createLogger } from '../utils/logger';

const log = createLogger('Interaction');

export type AnyRepliable =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | ModalSubmitInteraction
  | RepliableInteraction;

/**
 * Replies to an interaction with an ephemeral error message, choosing the right
 * method depending on whether the interaction was already acknowledged.
 */
export async function safeReplyError(
  interaction: AnyRepliable,
  message: string,
): Promise<void> {
  const payload = { content: message, flags: MessageFlags.Ephemeral } as const;
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (err) {
    log.error('Failed to deliver error message to user.', err);
  }
}

/**
 * Wraps an interaction handler so that any thrown error is logged and reported
 * to the user without crashing the process.
 */
export async function withErrorBoundary(
  interaction: AnyRepliable,
  scope: string,
  handler: () => Promise<void>,
): Promise<void> {
  try {
    await handler();
  } catch (err) {
    log.error(`Unhandled error in ${scope}.`, err);
    await safeReplyError(
      interaction,
      '⚠️ Algo deu errado. Tente novamente em instantes.',
    );
  }
}
