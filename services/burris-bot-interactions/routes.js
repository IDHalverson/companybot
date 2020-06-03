const { app } = require("../../index");
const BurrisBot = require("./burris-bot");

const burrisBot = new BurrisBot();

app.message(/(.)*burris(\-|\_)*bot(.)*/i, async ({ context, say }) => {
  await say(burrisBot.getBurrisBotGreeting());
});
