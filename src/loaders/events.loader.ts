import { Client } from 'discord.js';
import { events } from '../events';
import { createLogger } from '../utils/logger';

const log = createLogger('EventsLoader');

/** Attaches every registered gateway event to the client. */
export function registerEvents(client: Client): void {
  for (const event of events) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...(args as never)));
    } else {
      client.on(event.name, (...args) => event.execute(...(args as never)));
    }
  }
  log.info(`Registered ${events.length} gateway event(s).`);
}
