import { Command } from '../interfaces';
import { profileCommand } from './profile.command';
import { rankingGlobalCommand } from './ranking-global.command';
import { helpCommand } from './help.command';

/**
 * Ordered registry of every slash command in the bot.
 *
 * Note: there is no `/daily` command. The daily challenge starts from the
 * button on the permanent panel in the daily-questions channel. The per-server
 * Top 5 lives as a permanent message in the ranking channel; `/ranking_global`
 * shows the cross-server ranking, and `/profile_duolingo` the caller's own.
 */
export const commands: Command[] = [
  profileCommand,
  rankingGlobalCommand,
  helpCommand,
];

/** Lookup map by command name for the interaction router. */
export const commandMap = new Map<string, Command>(
  commands.map((command) => [command.data.name, command]),
);
