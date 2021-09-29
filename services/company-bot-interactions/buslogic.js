const { get } = require("lodash");
const { app } = require("../../index");
const { companyBlue } = require("../../colors");

const companyBotPostInChannel = async ({ payload, context }) => {
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
        text: payload.text
          .replace(
            new RegExp(`${process.env.COMPANYNAME_LOWERCASE_NOSPACES
              }bot\\spost\\sin\\s\\<\\#([A-Za-z0-9]+)\\|[a-z\\-\\_]+\\>\\s`),
            ""
          )
          .replace(/\n\*([\s]+)\*/g, "\n$1"),
        // keep @here, @channel, etc.
        parse: "full"
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
          limit: 5000
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
          parse: "full"
        });
      });


    }
  } catch (e) {
    console.error(e.stack);
  }
};

module.exports = { companyBotPostInChannel, companyBotMessageAllUsers };
