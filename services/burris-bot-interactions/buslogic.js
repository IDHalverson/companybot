const { get } = require("lodash");
const { app } = require("../../index");

const burrisBotPostInChannel = async ({ payload, context }) => {
  try {
    if (
      payload &&
      payload.user &&
      process.env.BOT_POSTS_USERS.split(",").includes(payload.user)
    ) {
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: get(context, "matches[1]"),
        text: payload.text
          .replace(
            /burrisbot\spost\sin\s\<\#([A-Za-z0-9]+)\|[a-z\-\_]+\>\s/,
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

module.exports = { burrisBotPostInChannel };
