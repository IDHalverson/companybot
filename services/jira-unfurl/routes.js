const { app } = require("../../index");
const {
  jiraUnfurlCallback,
  jiraUnfurlDetailedCallback
} = require("./buslogic");

app.message(/((?<!([A-Z]{1,10})-?)[A-Z]+-\d+)/, jiraUnfurlCallback);

app.command("/jira", jiraUnfurlCallback);

app.command("/jira-details", jiraUnfurlDetailedCallback);
