import {
  Client,
  EmbedBuilder,
  Message,
  TextChannel,
} from 'discord.js';
import { BRAND_COLOR, CHANNELS, RANKING_SIZE, RANK_LABELS } from '../constants';
import { GuildScoreWithUser } from '../repositories';
import { createLogger } from '../utils/logger';
import { userService } from './user.service';

const log = createLogger('RankingService');

/** Marker placed in the embed footer to locate the bot's ranking message. */
const RANKING_FOOTER_TAG = 'English Streak • Ranking do Servidor';
/** Accepted footer tags (incl. legacy global ones) for locating the message. */
const RANKING_FOOTER_TAGS = [
  RANKING_FOOTER_TAG,
  'English Streak • Ranking Global',
  'English Streak • Global Ranking',
];

/**
 * Builds and maintains the per-server Top-5 leaderboard as a single permanent
 * message in the ranking channel (refreshed on cron and after completions).
 *
 * The ranking channel belongs to one server, so the message only ever shows
 * that server's players. The full cross-server ranking lives behind the
 * `/ranking_global` command instead.
 */
export class RankingService {
  /** Cached id of the auto-updated ranking message, to avoid re-scanning. */
  private rankingMessageId: string | null = null;

  /** Builds the per-server leaderboard embed (Top 5 + how-to-use). */
  async buildEmbed(guildId: string): Promise<EmbedBuilder> {
    const top = await userService.getGuildLeaderboard(guildId, RANKING_SIZE);

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle('🏆 Ranking do Servidor — Top 5')
      .setFooter({ text: RANKING_FOOTER_TAG });

    if (top.length === 0) {
      embed.setDescription(
        'Ninguém deste servidor jogou ainda. Seja o primeiro — comece o desafio no canal de perguntas! 🚀',
      );
      this.addUsageField(embed);
      return embed;
    }

    embed.setDescription(top.map((row, i) => this.formatRow(row, i)).join('\n\n'));
    this.addUsageField(embed);
    return embed;
  }

  /** Explains how to use this channel (the commands), shown on every embed. */
  private addUsageField(embed: EmbedBuilder): void {
    embed.addFields({
      name: 'ℹ️ Como usar este canal',
      value: [
        'Este Top 5 é **deste servidor** e é atualizado automaticamente.',
        '• `/ranking_global` — veja o ranking de **todos os servidores** (privado)',
        '• `/profile_duolingo` — veja suas estatísticas completas **e sua posição** (privado)',
        '_As respostas são privadas, então este canal fica sempre limpo._',
      ].join('\n'),
    });
  }

  private formatRow(row: GuildScoreWithUser, index: number): string {
    const label = RANK_LABELS[index] ?? `#${index + 1}`;
    return [
      `${label}  **${this.escape(row.username)}**`,
      `> 🏅 ${row.points} pts · 🔥 ${row.user.currentStreak} dia(s) de ofensiva · 🏆 recorde ${row.user.bestStreak}`,
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

    // The channel belongs to exactly one server: that's whose ranking we show.
    const embed = await this.buildEmbed(channel.guildId);

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
          m.embeds.some(
            (e) => e.footer != null && RANKING_FOOTER_TAGS.includes(e.footer.text),
          ),
      );
      return mine ?? null;
    } catch (err) {
      log.warn('Failed to scan ranking channel for existing message.', err);
      return null;
    }
  }
}

export const rankingService = new RankingService();
