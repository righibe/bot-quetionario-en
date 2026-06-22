import {
  Client,
  EmbedBuilder,
  Message,
  TextChannel,
} from 'discord.js';
import { User } from '@prisma/client';
import { BRAND_COLOR, CHANNELS, RANKING_SIZE, RANK_LABELS } from '../constants';
import { createLogger } from '../utils/logger';
import { userService } from './user.service';

const log = createLogger('RankingService');

/** Hidden marker placed in the embed footer to locate the bot's ranking message. */
const RANKING_FOOTER_TAG = 'English Streak • Global Ranking';

/**
 * Builds and maintains the global Top-5 leaderboard, both on demand (/ranking)
 * and automatically (cron / after completions).
 */
export class RankingService {
  /** Cached id of the auto-updated ranking message, to avoid re-scanning. */
  private rankingMessageId: string | null = null;

  /**
   * Builds the leaderboard embed from the current top users.
   * @param includeUsage append the "how to use this channel" field (for the
   *   permanent channel message; omitted in the /ranking reply that already
   *   shows the caller's position).
   */
  async buildEmbed(includeUsage = true): Promise<EmbedBuilder> {
    const top = await userService.getLeaderboard(RANKING_SIZE);

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle('🏆 Global Ranking — Top 5')
      .setFooter({ text: RANKING_FOOTER_TAG })
      .setTimestamp(new Date());

    if (top.length === 0) {
      embed.setDescription(
        'No one has played yet. Be the first — start the challenge in the daily channel! 🚀',
      );
      if (includeUsage) this.addUsageField(embed);
      return embed;
    }

    embed.setDescription(
      top.map((user, i) => this.formatRow(user, i)).join('\n\n'),
    );
    if (includeUsage) this.addUsageField(embed);
    return embed;
  }

  /** Explains how to use this channel (the commands), shown on every embed. */
  private addUsageField(embed: EmbedBuilder): void {
    embed.addFields({
      name: 'ℹ️ How to use this channel',
      value: [
        '• `/ranking` — see this Top 5 **and your own position**',
        '• `/profile` — your full stats (points, streak, accuracy)',
        '_Both replies are private, so this channel stays clean._',
      ].join('\n'),
    });
  }

  private formatRow(user: User, index: number): string {
    const label = RANK_LABELS[index] ?? `#${index + 1}`;
    return [
      `${label} **${this.escape(user.username)}**`,
      `> 🏅 ${user.points} pts • 🔥 ${user.currentStreak} day streak • 🏆 best ${user.bestStreak}`,
    ].join('\n');
  }

  private escape(text: string): string {
    // Neutralize Discord markdown in usernames.
    return text.replace(/[*_~`>|]/g, '\\$&');
  }

  /**
   * Posts or edits the auto-updated ranking message in the configured channel.
   * Safe to call frequently; all Discord calls are error-guarded.
   */
  async updateRankingChannel(client: Client): Promise<void> {
    const channelId = CHANNELS.ranking;
    if (!channelId) {
      log.warn(
        'CHANNEL_RANKING is not set — the ranking message cannot be published. ' +
          'Set it in your .env (channel id) and restart.',
      );
      return;
    }

    let channel: TextChannel;
    try {
      const fetched = await client.channels.fetch(channelId);
      if (!fetched || !fetched.isTextBased() || fetched.isDMBased()) {
        log.warn(`Ranking channel ${channelId} is not a server text channel.`);
        return;
      }
      channel = fetched as TextChannel;
    } catch (err) {
      log.warn(`Failed to fetch ranking channel ${channelId}.`, err);
      return;
    }

    const embed = await this.buildEmbed();

    const existing = await this.findRankingMessage(channel, client);
    try {
      if (existing) {
        await existing.edit({ embeds: [embed] });
        this.rankingMessageId = existing.id;
      } else {
        const sent = await channel.send({ embeds: [embed] });
        this.rankingMessageId = sent.id;
      }
      log.info('Ranking channel updated.');
    } catch (err) {
      log.error('Failed to publish ranking message.', err);
    }
  }

  /** Locates the existing ranking message authored by the bot, if any. */
  private async findRankingMessage(
    channel: TextChannel,
    client: Client,
  ): Promise<Message | null> {
    if (this.rankingMessageId) {
      try {
        return await channel.messages.fetch(this.rankingMessageId);
      } catch {
        this.rankingMessageId = null; // stale; fall through to scan
      }
    }

    try {
      const recent = await channel.messages.fetch({ limit: 25 });
      const mine = recent.find(
        (m) =>
          m.author.id === client.user?.id &&
          m.embeds.some((e) => e.footer?.text === RANKING_FOOTER_TAG),
      );
      return mine ?? null;
    } catch (err) {
      log.warn('Failed to scan ranking channel for existing message.', err);
      return null;
    }
  }
}

export const rankingService = new RankingService();
