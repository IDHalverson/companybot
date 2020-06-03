const { app } = require("../../index");
const BurrisBot = require("./burris-bot");

const burrisBot = new BurrisBot();

app.message(/(.)*burris(\-|\_)*bot(.)*/i, async ({ say }) => {
  await say(burrisBot.getBurrisBotGreeting());
});

app.command("/say-good-morning", async ({ ack, say }) => {
  await ack();
  say(burrisBot.getGoodMorningGreeting());
});
