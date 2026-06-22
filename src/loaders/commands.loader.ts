import { REST, Routes } from 'discord.js';
import { env } from '../config';
import { commands } from '../commands';
import { createLogger } from '../utils/logger';

const log = createLogger('CommandsLoader');

/**
 * Registers all slash commands with Discord — always GUILD-SCOPED, never global.
 *
 * Guild-scoped commands appear **instantly** (global ones can take up to ~1 hour
 * to propagate) and keep the bot's commands confined to the servers it serves.
 *
 *  - If DISCORD_GUILD_ID is set, commands are registered to that single guild.
 *  - Otherwise they are registered to every guild the bot is currently in.
 *
 * The application (client) id is resolved automatically from the bot token, so
 * no DISCORD_CLIENT_ID env var is needed.
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

    const guildIds = await resolveGuildIds(rest);
    if (guildIds.length === 0) {
      log.warn(
        'No guild to register commands in. Invite the bot to a server ' +
          '(or set DISCORD_GUILD_ID in .env) and restart.',
      );
      return;
    }

    for (const guildId of guildIds) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
      log.info(`Registered ${body.length} command(s) to guild ${guildId}.`);
    }
  } catch (err) {
    log.error('Failed to register slash commands.', err);
    throw err;
  }
}

/**
 * The guilds to register commands in: the explicit DISCORD_GUILD_ID override
 * when set, otherwise every guild the bot is currently a member of (fetched via
 * REST, since this runs before the gateway login populates the client cache).
 */
async function resolveGuildIds(rest: REST): Promise<string[]> {
  if (env.discord.guildId) return [env.discord.guildId];

  const guilds = (await rest.get(Routes.userGuilds())) as { id: string }[];
  return guilds.map((guild) => guild.id);
}
