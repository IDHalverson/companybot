const axios = require("axios");
const { get, uniq } = require("lodash");
const { app } = require("../../index");
const {
  INTERVAL_IN_MS,
  TRAFFIC_CHECKS_CHANNEL,
  TRIGGER,
  ACTIVE_CONVOS_CHANNEL,
} = require("./constants");

const handleTrafficMonitor = async ({ payload, context }) => {
  // Only public channels
  // TODO: remove testing 'true'
  if (payload.channel_type === "channel") {
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

    if (!mostRecentTrafficCheck || now - lastTCTime > INTERVAL_IN_MS) {
      const recentConversationsInChannel =
        await app.client.conversations.history({
          token: context.botToken,
          channel: payload.channel,
          limit: TRIGGER.quantity + 1,
          oldest: (now - TRIGGER.timespanInMS) / 1000,
        });
      if (recentConversationsInChannel.messages.length >= TRIGGER.quantity) {
        // Check if we already notified that it's active within last RENOTIFY_WAIT ms
        const recentConversationsInActiveConvosChannel =
          await app.client.conversations.history({
            token: context.botToken,
            channel: ACTIVE_CONVOS_CHANNEL,
            limit: 100,
            oldest: (now - RENOTIFY_WAIT) / 1000,
          });
        const alreadyPosted =
          recentConversationsInActiveConvosChannel.messages.find((message) => {
            return message.text.startsWith(
              `Active conversation in <#${payload.channel}>`
            );
          });

        if (!alreadyPosted) {
          await app.client.chat.postMessage({
            token: context.botToken,
            channel: ACTIVE_CONVOS_CHANNEL,
            text: `Active conversation in <#${payload.channel}>\n\n${
              recentConversationsInChannel.messages.length
            } messages in the last ${Math.round(
              TRIGGER.timespanInMS / 1000 / 60
            )} minutes.`,
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
