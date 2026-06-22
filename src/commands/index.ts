import { Command } from '../interfaces';
import { profileCommand } from './profile.command';
import { helpCommand } from './help.command';

/**
 * Ordered registry of every slash command in the bot.
 *
 * Note: there is no `/daily` command. The daily challenge starts from the
 * button on the permanent panel in the daily-questions channel. There is also
 * no `/ranking` command — the Top 5 lives as a permanent message in the ranking
 * channel, and `/profile_duolingo` shows the caller's own position.
 */
export const commands: Command[] = [
  profileCommand,
  helpCommand,
];

/** Lookup map by command name for the interaction router. */
export const commandMap = new Map<string, Command>(
  commands.map((command) => [command.data.name, command]),
);
