const { app } = require("../../index");
const BurrisBot = require("./burris-bot");
const { get } = require("lodash");

const burrisBot = new BurrisBot();

app.message(
  /burrisbot\spost\sin\s\<\#([A-Za-z0-9]+)\|[a-z\-\_]+\>\s(.+)/,
  async ({ payload, context }) => {
    try {
      if (
        payload &&
        payload.user &&
        process.env.BOT_POSTS_USERS.split(",").includes(payload.user)
      ) {
        await app.client.chat.postMessage({
          token: context.botToken,
          channel: get(context, "matches[1]"),
          text: get(context, "matches[2]")
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
);

app.message(/(.)*burris(\-|\_)*bot(.)*/i, async ({ say }) => {
  await say(burrisBot.getBurrisBotGreeting());
});

app.command("/say-good-morning", async ({ ack, say }) => {
  await ack();
  say(burrisBot.getGoodMorningGreeting());
});
