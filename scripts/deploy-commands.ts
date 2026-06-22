import { registerCommands } from '../src/loaders';
import { logger } from '../src/utils/logger';

/**
 * Standalone slash-command deployment script.
 * Usage: npm run deploy:commands
 *
 * Registers guild commands instantly when DISCORD_GUILD_ID is set, otherwise
 * registers global commands.
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
