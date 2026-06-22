import { Command } from '../interfaces';
import { dailyCommand } from './daily.command';
import { profileCommand } from './profile.command';
import { rankingCommand } from './ranking.command';
import { helpCommand } from './help.command';

/** Ordered registry of every slash command in the bot. */
export const commands: Command[] = [
  dailyCommand,
  profileCommand,
  rankingCommand,
  helpCommand,
];

/** Lookup map by command name for the interaction router. */
export const commandMap = new Map<string, Command>(
  commands.map((command) => [command.data.name, command]),
);
