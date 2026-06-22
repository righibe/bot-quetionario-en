import { Events, Interaction } from 'discord.js';
import { BotEvent } from '../interfaces';
import { commandMap } from '../commands';
import { withErrorBoundary } from '../middlewares';
import {
  handleDailyButton,
  handleDailyModal,
  isDailyComponent,
} from './dailyInteraction.handler';
import { createLogger } from '../utils/logger';

const log = createLogger('InteractionCreate');

/**
 * Central router for every incoming interaction. Slash commands, buttons and
 * modals are dispatched to their handlers, each wrapped in an error boundary so
 * a single failing handler can never take down the process.
 */
export const interactionCreateEvent: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction): Promise<void> {
    // ---- Slash commands ----
    if (interaction.isChatInputCommand()) {
      const command = commandMap.get(interaction.commandName);
      if (!command) {
        log.warn(`Unknown command: ${interaction.commandName}`);
        return;
      }
      await withErrorBoundary(interaction, `command:${interaction.commandName}`, () =>
        command.execute(interaction),
      );
      return;
    }

    // ---- Buttons (daily flow) ----
    if (interaction.isButton() && isDailyComponent(interaction)) {
      await withErrorBoundary(interaction, 'button:daily', () =>
        handleDailyButton(interaction),
      );
      return;
    }

    // ---- Modals (daily free-text flow) ----
    if (interaction.isModalSubmit() && isDailyComponent(interaction)) {
      await withErrorBoundary(interaction, 'modal:daily', () =>
        handleDailyModal(interaction),
      );
      return;
    }
  },
};
