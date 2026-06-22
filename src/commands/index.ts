import { Command } from '../interfaces';
import { profileCommand } from './profile.command';
import { rankingCommand } from './ranking.command';
import { helpCommand } from './help.command';

/**
 * Ordered registry of every slash command in the bot.
 *
 * Note: there is no `/daily` command. The daily challenge starts from the
 * button on the permanent panel in the daily-questions channel.
 */
export const commands: Command[] = [
  profileCommand,
  rankingCommand,
  helpCommand,
];

/** Lookup map by command name for the interaction router. */
export const commandMap = new Map<string, Command>(
  commands.map((command) => [command.data.name, command]),
);
