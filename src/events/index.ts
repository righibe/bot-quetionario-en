import { BotEvent } from '../interfaces';
import { readyEvent } from './ready.event';
import { interactionCreateEvent } from './interactionCreate.event';

/** Every gateway event the bot listens to. */
export const events: BotEvent[] = [
  readyEvent as unknown as BotEvent,
  interactionCreateEvent as unknown as BotEvent,
];
