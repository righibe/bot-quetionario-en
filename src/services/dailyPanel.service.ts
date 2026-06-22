import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Message,
  TextChannel,
} from 'discord.js';
import {
  BRAND_COLOR,
  CHANNELS,
  CUSTOM_IDS,
  DAILY_QUESTION_COUNT,
  MAX_DAILY_POINTS,
  POINTS_PER_CORRECT_ANSWER,
} from '../constants';
import { createLogger } from '../utils/logger';

const log = createLogger('DailyPanelService');

/** Hidden marker placed in the embed footer to locate the bot's panel message. */
const PANEL_FOOTER_TAG = 'English Streak • Daily Challenge';

/**
 * Maintains the single, permanent "panel" message in the daily-questions
 * channel. The panel is the only thing users interact with there: a short
 * explanation plus a button that starts the private, button-only quiz. There is
 * no `/daily` command — everything begins from this message.
 */
export class DailyPanelService {
  /** Cached id of the panel message, to avoid re-scanning the channel. */
  private panelMessageId: string | null = null;

  /** Builds the instructional embed shown on the panel. */
  buildEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle('🔥 Daily English Challenge')
      .setDescription(
        [
          'Practice **technical English** every day, one challenge at a time.',
          '',
          '**How to play**',
          `• Press the button below to start today’s **${DAILY_QUESTION_COUNT} questions**.`,
          '• Just **click the correct option** — every question is multiple choice.',
          `• Each correct answer = **${POINTS_PER_CORRECT_ANSWER} pts** (up to **${MAX_DAILY_POINTS}/day**).`,
          '• Your questions and answers are **private** — only you can see them.',
          '• You can play **once per day**. Come back daily to grow your 🔥 streak!',
        ].join('\n'),
      )
      .setFooter({ text: PANEL_FOOTER_TAG });
  }

  /** Builds the action row holding the "start" button. */
  private buildComponents(): ActionRowBuilder<ButtonBuilder>[] {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.daily.start)
        .setLabel('▶️ Start today’s challenge')
        .setStyle(ButtonStyle.Success),
    );
    return [row];
  }

  /**
   * Posts or edits the permanent panel message in the configured daily channel.
   * Safe to call on boot and on every daily rollover; all calls are guarded.
   */
  async updateChannel(client: Client): Promise<void> {
    const channelId = CHANNELS.dailyQuestions;
    if (!channelId) {
      log.debug('No daily channel configured; skipping panel update.');
      return;
    }

    let channel: TextChannel;
    try {
      const fetched = await client.channels.fetch(channelId);
      if (!fetched || !fetched.isTextBased() || fetched.isDMBased()) {
        log.warn(`Daily channel ${channelId} is not a server text channel.`);
        return;
      }
      channel = fetched as TextChannel;
    } catch (err) {
      log.warn(`Failed to fetch daily channel ${channelId}.`, err);
      return;
    }

    const embed = this.buildEmbed();
    const components = this.buildComponents();

    const existing = await this.findPanelMessage(channel, client);
    try {
      if (existing) {
        await existing.edit({ embeds: [embed], components });
        this.panelMessageId = existing.id;
      } else {
        const sent = await channel.send({ embeds: [embed], components });
        this.panelMessageId = sent.id;
      }
      log.info('Daily panel updated.');
    } catch (err) {
      log.error('Failed to publish daily panel message.', err);
    }
  }

  /** Locates the existing panel message authored by the bot, if any. */
  private async findPanelMessage(
    channel: TextChannel,
    client: Client,
  ): Promise<Message | null> {
    if (this.panelMessageId) {
      try {
        return await channel.messages.fetch(this.panelMessageId);
      } catch {
        this.panelMessageId = null; // stale; fall through to scan
      }
    }

    try {
      const recent = await channel.messages.fetch({ limit: 25 });
      const mine = recent.find(
        (m) =>
          m.author.id === client.user?.id &&
          m.embeds.some((e) => e.footer?.text === PANEL_FOOTER_TAG),
      );
      return mine ?? null;
    } catch (err) {
      log.warn('Failed to scan daily channel for existing panel.', err);
      return null;
    }
  }
}

export const dailyPanelService = new DailyPanelService();
