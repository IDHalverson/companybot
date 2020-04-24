require('dotenv').config()
const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});



// code here

app.event('message.channels', async ({event, context}) => {
  try {
    console.log(event);
    console.log(context);
  } catch (e) {
    console.error(e)
  }
});


(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('Burris Bot is now running!');
})();
