const { app } = require("../../index");
const {
  jiraUnfurlCallback,
  jiraUnfurlDetailedCallback
} = require("./buslogic");
const axios = require("axios");

// TEMPORARY UNTIL FIXED
app.message(/((?<!([A-Z]{1,10})-?)(?:SCP|V4)-\d+)/, jiraUnfurlCallback);

// app.message(/((?<!([A-Z]{1,10})-?)[A-Z0-9]+-\d+)/, jiraUnfurlCallback);

const unavailable = async ({ context, command, ack }) => {
  ack();
  let postParams = {
    token: context.botToken,
    icon_emoji: ":jira:",
    username: "JIRA",
    text: "Sorry, Burris Bot's JIRA integration will be repaired soon.",
    response_type: "in_channel"
  };
  axios.post(command.response_url, postParams);
}

app.command("/jira",
  unavailable
  // jiraUnfurlCallback
);

app.command("/jira-details",
  unavailable
  // jiraUnfurlDetailedCallback
);