const { app } = require("../../index");
const BurrisBot = require("./burris-bot");
const {
  burrisBotPostInChannel,
  burrisBotMessageAllUsers
} = require("./buslogic");

const burrisBot = new BurrisBot();

app.message(
  // Adding 0-9 to the channel name causes entire message to get posted instead
  // of specified text... TODO: fix
  /burrisbot\spost\sin\s\<\#([A-Za-z0-9]+)\|[a-z\-\_]+\>\s(.+)/,
  burrisBotPostInChannel
);

// app.message(
//   /burrisbot\smessage\s\<\@([A-Za-z0-9]+)\>\s(.+)/,
//   burrisBotMessageUser
// );

app.message(/burrisbot\smessage\severyone\s?(.*)/, burrisBotMessageAllUsers);

app.message(/(.)*burris(\-|\_)*bot(?!\:)(.)*/i, async ({ say }) => {
  await say(burrisBot.getBurrisBotGreeting());
});

app.command("/say-good-morning", async ({ ack, say }) => {
  await ack();
  say(burrisBot.getGoodMorningGreeting());
});
