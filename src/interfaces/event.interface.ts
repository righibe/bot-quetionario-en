import { ClientEvents } from 'discord.js';

/** Contract every gateway event module must fulfil. */
export interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (...args: ClientEvents[K]) => Promise<void> | void;
}
