const { get } = require("lodash");
const { app } = require("../../index");
const { companyBlue } = require("../../colors");

const companyBotPostInChannel = async ({ payload, context }) => {
  console.log("companyBotPostInChannel", payload, context);
  try {
    if (
      payload &&
      payload.user &&
      // You must be configured with access to make CompanyBot post
      process.env.BOT_POSTS_USERS.split(",").includes(payload.user)
    ) {
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: get(context, "matches[1]"),
        text: get(context, "matches[2]"),
        // keep @here, @channel, etc.
        parse: "full",
      });
    }
  } catch (e) {
    console.error(e.stack);
  }
};

const companyBotMessageAllUsers = async ({ payload, context }) => {
  try {
    if (
      false &&
      // disabled until needed
      payload &&
      payload.user &&
      process.env.BOT_POSTS_USERS.split(",").includes(payload.user)
    ) {
      const users =
        (await app.client.users.list({
          token: context.botToken,
          limit: 5000,
        })) || {};

      const userIds = (users.members || [])
        .filter((u) => !u.is_bot && u.name !== "slackbot")
        .map((u) => u.id);

      userIds.forEach(async (userId) => {
        await app.client.chat.postMessage({
          token: context.botToken,
          channel: userId,
          text: undefined,
          attachments: [],
          // keep @here, @channel, etc.
          parse: "full",
        });
      });
    }
  } catch (e) {
    console.error(e.stack);
  }
};

const addEmoji =
  (emojiName) =>
  async ({ payload, context }) => {
    app.client.reactions.add({
      token: context.botToken,
      channel: payload.channel,
      name: emojiName,
      timestamp: payload.ts,
    });
  };

module.exports = {
  companyBotPostInChannel,
  companyBotMessageAllUsers,
  addEmoji,
};
