import { Client } from 'discord.js';
import { env, INTENTS } from './config';
import { connectDatabase, disconnectDatabase } from './database';
import { questionService } from './services';
import { registerCommands, registerEvents } from './loaders';
import { dailyJob } from './jobs';
import { logger } from './utils/logger';

/**
 * Application bootstrap.
 * Order matters: validate config & data -> connect DB -> wire events ->
 * register commands -> log in -> schedule cron.
 */
async function bootstrap(): Promise<void> {
  logger.info('Starting English Streak bot…');

  // 1. Load & validate the static question bank (fails fast if missing/invalid).
  questionService.load();

  // 2. Connect to PostgreSQL.
  await connectDatabase();

  // 3. Create the Discord client (privileged-intent free).
  const client = new Client({ intents: INTENTS });

  // 4. Wire gateway events before logging in.
  registerEvents(client);

  // 5. Register slash commands with Discord.
  await registerCommands();

  // 6. Log in.
  await client.login(env.discord.token);

  // 7. Schedule the daily rollover job.
  dailyJob.start(client);

  // 8. Graceful shutdown.
  registerShutdownHandlers(client);
}

function registerShutdownHandlers(client: Client): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Shutting down gracefully…`);
    try {
      dailyJob.stop();
      client.removeAllListeners();
      await client.destroy();
      await disconnectDatabase();
    } catch (err) {
      logger.error('Error during shutdown.', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection.', reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception.', err);
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal error during startup. Exiting.', err);
  process.exit(1);
});
