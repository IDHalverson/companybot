require("dotenv").config();
const { App, WorkflowStep } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("Company Bot is now running!");
})();

module.exports = { app, WorkflowStep };

require("./services/email-solutions/routes.js");
require("./services/listen-for-here/routes.js");
require("./services/jira-tagger/routes.js");
require("./services/company-bot-interactions/routes.js");
require("./services/jira-unfurl/routes.js");
require("./services/standup-checklist/routes.js");
require("./services/always-tag/routes.js");
require("./services/pass-along-prod-notification/routes.js");
require("./services/move-to-thread/routes.js");
require("./services/emoji/routes.js");
require("./services/wordle/routes.js");
require("./services/your-face/routes.js");
require("./services/confessions/routes.js");
require("./services/traffic-monitor/routes.js");
