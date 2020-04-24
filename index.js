require('dotenv').config()
const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const getRandomInt = (max) => {
  return Math.floor(Math.random() * Math.floor(max));
}

const burrisBotGreetings = [
  "Make It Happen! :burris_snowflake_png:",
  "Get It Right! :burris_snowflake_png:",
  "I Am Burris! :burris_snowflake_png:"
]

// code here

// app.event('message.channels', async ({event, context}) => {
//   try {
//     console.log(event);
//     console.log(context);
//   } catch (e) {
//     console.error(e)
//   }
// });

app.message(/(.)*burris(\-)*bot(.)*/, async ({ context, say }) => {
  let greeting = burrisBotGreetings[getRandomInt(burrisBotGreetings.length)];
  if (!greeting) {
    greeting = burrisBotGreetings[getRandomInt(burrisBotGreetings.length)];
  }
  await say(`${greeting}`);
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('Burris Bot is now running!');
})();
