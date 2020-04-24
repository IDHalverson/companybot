require('dotenv').config()
const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});



// code here


(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('Burris Bot is now running!');
})();
