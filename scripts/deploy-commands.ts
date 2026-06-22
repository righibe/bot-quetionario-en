import { registerCommands } from '../src/loaders';
import { logger } from '../src/utils/logger';

/**
 * Standalone slash-command deployment script.
 * Usage: npm run deploy:commands
 *
 * Registers guild commands instantly: to DISCORD_GUILD_ID when set, otherwise
 * to every guild the bot is in. Commands are never registered globally.
 */
async function main(): Promise<void> {
  await registerCommands();
  logger.info('Slash commands deployed successfully.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Failed to deploy commands.', err);
    process.exit(1);
  });
