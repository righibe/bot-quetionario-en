import { GatewayIntentBits, Partials } from 'discord.js';

/**
 * Privileged-intent-free configuration.
 *
 * The whole bot is built around Slash Commands, Buttons, Select Menus and
 * Modals, so we only ever need the base `Guilds` intent.
 *
 *  - NO MessageContent  -> we never read user chat messages.
 *  - NO GuildPresences  -> we never read online status / activities.
 *  - NO GuildMembers    -> role creation/assignment is done with the member
 *                          object that already comes inside the interaction,
 *                          so continuous member monitoring is never required.
 *
 * This keeps the bot fully compliant and trivially scalable past the 100-guild
 * verification gate without complex Privileged Intent justifications.
 */
export const INTENTS: GatewayIntentBits[] = [GatewayIntentBits.Guilds];

/**
 * No partials are required for the interaction-only model, but we keep this
 * export as a single source of truth in case it is needed later.
 */
export const PARTIALS: Partials[] = [];
