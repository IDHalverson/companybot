const axios = require("axios");
const { get, uniq } = require("lodash");
const { app } = require("../../index");
const {
  INTERVAL_IN_MS,
  TRAFFIC_CHECKS_CHANNEL,
  TRIGGER,
  ACTIVE_CONVOS_CHANNEL,
  RENOTIFY_WAIT_IN_MS,
  BOT_TESTING_CHANNEL,
  NUMBER_OF_KEYWORDS,
  MAXIMUM_KEYWORD_LENGTH,
} = require("./constants");

const TEST_MODE = false;

const handleTrafficMonitor = async ({ payload, context }) => {
  TEST_MODE && console.log("Warning! TEST_MODE is on!");
  // Only public channels
  // TODO: remove testing 'true'
  if (TEST_MODE || payload.channel_type === "channel") {
    const now = Date.now();

    const recentMessages = await app.client.conversations.history({
      token: context.botToken,
      channel: TRAFFIC_CHECKS_CHANNEL,
      limit: 10,
    });

    const mostRecentTrafficCheck = recentMessages.messages.reduce(
      (latest, message) => {
        if (
          message.text.match(
            new RegExp(`TRAFFIC CHECK @[0-9]+ for ${payload.channel}`)
          )
        ) {
          if (!latest || message.ts > latest.ts) {
            return message;
          } else {
            return latest;
          }
        } else {
          return latest;
        }
      },
      null
    );

    const lastTCTime = !mostRecentTrafficCheck
      ? now
      : Number(mostRecentTrafficCheck.text.match(/@([0-9]+) for /)[1]);

    if (
      TEST_MODE ||
      !mostRecentTrafficCheck ||
      now - lastTCTime > INTERVAL_IN_MS
    ) {
      const recentConversationsInChannel =
        await app.client.conversations.history({
          token: context.botToken,
          channel: payload.channel,
          limit: 200,
          oldest: (now - TRIGGER.timespanInMS) / 1000,
        });
      const participantIds = uniq(
        recentConversationsInChannel.messages.map((m) => m.user).filter(Boolean)
      );
      const userInfos = await Promise.all(
        participantIds.map((p) =>
          app.client.users.info({
            token: context.botToken,
            user: p,
          })
        )
      );

      const nonBotParticipants = userInfos.filter((u) => !u.user.is_bot);
      const nonBotParticipantIds = nonBotParticipants.map((u) => u.user.id);

      const allTimestamps = recentConversationsInChannel.messages.map((m) =>
        Number(m.ts)
      );
      const allUniqueWords = uniq(
        recentConversationsInChannel.messages.reduce((words, m) => {
          // Only non-bots!
          if (nonBotParticipantIds.includes(m.user)) {
            return words.concat(m.text.split(/\s+/).map((it) => it.trim()));
          } else {
            return words;
          }
        }, [])
      );

      const actualTimeScopeInSeconds =
        Math.max(...allTimestamps) - Math.min(...allTimestamps);
      const timespanInMinutes = actualTimeScopeInSeconds / 60;
      const uniqueWordsPerMinuteRate =
        allUniqueWords.length / timespanInMinutes;

      if (
        TRIGGER.minimumActualTimespanInSeconds <= actualTimeScopeInSeconds &&
        uniqueWordsPerMinuteRate >= TRIGGER.uniqueWordsPerMinuteRate &&
        (TEST_MODE || TRIGGER.minimumParticipants <= nonBotParticipants.length)
      ) {
        // Check if we already notified that it's active within last RENOTIFY_WAIT_IN_MS ms
        const recentConversationsInActiveConvosChannel =
          await app.client.conversations.history({
            token: context.botToken,
            channel: ACTIVE_CONVOS_CHANNEL,
            limit: 100,
            oldest: (now - RENOTIFY_WAIT_IN_MS) / 1000,
          });
        const alreadyPosted =
          recentConversationsInActiveConvosChannel.messages.find((message) => {
            return message.text.startsWith(
              `*Active conversation in <#${payload.channel}>`
            );
          });

        if (TEST_MODE || !alreadyPosted) {
          let uniqueWordsSortedByLength = [...allUniqueWords];
          uniqueWordsSortedByLength.sort((a, b) => b.length - a.length);
          const uniqueWordsSortedByLengthNoSuperLongWords =
            uniqueWordsSortedByLength.filter(
              (word) => word.length <= MAXIMUM_KEYWORD_LENGTH
            );

          const choices = uniqueWordsSortedByLengthNoSuperLongWords.slice(
            0,
            NUMBER_OF_KEYWORDS
          );

          const emojiRegex = /^:[^:]+:$/;

          const firstLine = `*Active conversation detected in <#${payload.channel}>*`;
          const usersLine = `\n\n:busts_in_silhouette: ${nonBotParticipants
            .map(
              (u) => `\`${u.user.profile.display_name || u.user.real_name}\``
            )
            .join(", ")}`;
          const keywordsLine = `\n:speech_balloon: ${choices
            .map((choice) =>
              choice.match(emojiRegex) || choice.match(/^`[^`]+`$/)
                ? choice
                : `\`${choice}\``
            )
            .join(", ")}`;
          const triggerLine = `\n:chart_with_upwards_trend: _${
            allUniqueWords.length
          } unique words in the span of ~${Math.round(
            actualTimeScopeInSeconds / 60
          )} minutes._`;

          await app.client.chat.postMessage({
            token: context.botToken,
            channel: TEST_MODE ? BOT_TESTING_CHANNEL : ACTIVE_CONVOS_CHANNEL,
            text: `${firstLine}${usersLine}${keywordsLine}${triggerLine}`,
          });
        }
      }
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: TRAFFIC_CHECKS_CHANNEL,
        text: `TRAFFIC CHECK @${now} for ${payload.channel}`,
      });
    } else {
      // console.log(
      //   `Traffic Monitor: Not checking traffic because it has only been ${(
      //     Math.round((now - lastTCTime) / 1000, 2) / 60
      //   ).toFixed(2)} minutes since last check of ${
      //     payload.channel
      //   } (Required: ${INTERVAL_IN_MS / 1000 / 60} minutes).`
      // );
    }
  }
};

module.exports = {
  handleTrafficMonitor,
};
