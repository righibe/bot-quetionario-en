import { REST, Routes } from 'discord.js';
import { env } from '../config';
import { commands } from '../commands';
import { createLogger } from '../utils/logger';

const log = createLogger('CommandsLoader');

/**
 * Registers all slash commands with Discord.
 *
 * The application (client) ID is resolved automatically from the bot token via
 * the `/applications/@me` endpoint, so no DISCORD_CLIENT_ID env var is needed.
 *
 *  - If DISCORD_GUILD_ID is set, commands are registered to that guild only
 *    (instant — ideal for development).
 *  - Otherwise they are registered globally (production; first propagation may
 *    take up to ~1 hour).
 */
export async function registerCommands(): Promise<void> {
  const body = commands.map((command) => command.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(env.discord.token);

  try {
    // Resolve the application id straight from the token.
    const application = (await rest.get(Routes.oauth2CurrentApplication())) as {
      id: string;
    };
    const clientId = application.id;

    if (env.discord.guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, env.discord.guildId), {
        body,
      });
      log.info(
        `Registered ${body.length} guild command(s) to ${env.discord.guildId}.`,
      );
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
      log.info(`Registered ${body.length} global command(s).`);
    }
  } catch (err) {
    log.error('Failed to register slash commands.', err);
    throw err;
  }
}
