const { app } = require("../../index");
const BurrisBot = require("./burris-bot");
const { burrisBotPostInChannel } = require("./buslogic");

const burrisBot = new BurrisBot();

app.message(
  /burrisbot\spost\sin\s\<\#([A-Za-z0-9]+)\|[a-z\-\_]+\>\s(.+)/,
  burrisBotPostInChannel
);

app.message(/(.)*burris(\-|\_)*bot(.)*/i, async ({ say }) => {
  await say(burrisBot.getBurrisBotGreeting());
});

app.command("/say-good-morning", async ({ ack, say }) => {
  await ack();
  say(burrisBot.getGoodMorningGreeting());
});
