require("dotenv").config();
const { App, WorkflowStep } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("Burris Bot is now running!");
})();

module.exports = { app, WorkflowStep };

require("./services/email-solutions/routes.js");
require("./services/listen-for-here/routes.js");
require("./services/jira-tagger/routes.js");
require("./services/burris-bot-interactions/routes.js");
require("./services/jira-unfurl/routes.js");
require("./services/standup-checklist/routes.js");
require("./services/always-tag/routes.js");
require("./services/pass-along-prod-notification/routes.js");
require("./services/move-to-thread/routes.js")