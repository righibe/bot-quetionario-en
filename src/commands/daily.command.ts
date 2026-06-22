import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../interfaces';
import { dailyService, userService } from '../services';
import { renderQuestion } from '../utils/dailyRenderer';
import { createLogger } from '../utils/logger';

const log = createLogger('DailyCommand');

/**
 * /daily — starts the 5-question daily challenge.
 * Everything happens through ephemeral messages so answers stay private.
 */
export const dailyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Start your 5-question daily English challenge.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const discordId = interaction.user.id;
    const username = interaction.user.username;

    const user = await userService.ensureUser(discordId, username);

    if (dailyService.hasCompletedToday(user)) {
      await interaction.reply({
        content:
          '✅ You already completed today’s challenge!\n' +
          'Come back tomorrow to keep your 🔥 streak alive.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Reset any stale in-memory session and start fresh.
    dailyService.endSession(discordId);
    const session = await dailyService.startSession(
      user,
      discordId,
      interaction.guildId,
    );

    if (session.questions.length === 0) {
      await interaction.reply({
        content: '⚠️ No questions are available right now. Please try again later.',
        flags: MessageFlags.Ephemeral,
      });
      log.error('Daily session started with zero questions.');
      return;
    }

    const view = renderQuestion(session.questions[0], 0, session.questions.length);
    await interaction.reply({
      embeds: view.embeds,
      components: view.components,
      flags: MessageFlags.Ephemeral,
    });
  },
};
