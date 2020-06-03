const { app } = require("../../index");
const axios = require("axios");
const { get } = require("lodash");

const jiraUnfurlCallback = async ({ payload, context, ack }) => {
  try {
    ack && ack();
    // don't allow bot posts
    if (
      payload.text &&
      (!payload.subtype || payload.subtype !== "bot_message")
    ) {
      const jiraIdentifier = context.matches && context.matches[0];
      if (jiraIdentifier) {
        const jiraApiUrl = `${process.env.JIRA_API_URL_PREFIX}${jiraIdentifier}?expand=space`;
        const jiraBrowseUrl = `${process.env.JIRA_BROWSE_URL_PREFIX}${jiraIdentifier}`;
        const credentials = process.env.JIRA_CREDS;
        const [username, password] = new Buffer.from(credentials, "base64")
          .toString("utf-8")
          .split(":");
        const jiraCall = await axios.get(jiraApiUrl, {
          auth: {
            username,
            password
          }
        });
        if (jiraCall && jiraCall.status === 200) {
          const jiraJson = jiraCall.data;
          console.log(
            `JIRA unfurl: ${jiraIdentifier} in channel ${payload.channel}`
          );
          app.client.chat.postMessage({
            token: context.botToken,
            channel: payload.channel,
            icon_emoji: ":jira:",
            username: "JIRA",
            reply_broadcast: false,
            thread_ts: payload.thread_ts,
            attachments: [
              {
                color: "2684ff",
                text: `<${jiraBrowseUrl}|*${jiraIdentifier}: ${get(
                  jiraJson,
                  "fields.summary",
                  "?"
                )}*>\nStatus: \`${get(
                  jiraJson,
                  "fields.status.name",
                  "none"
                )}\`       Assignee: ${
                  !get(jiraJson, "fields.assignee.displayName")
                    ? "*Unassigned*"
                    : `<${process.env.JIRA_USER_PROFILE_PREFIX}${get(
                        jiraJson,
                        "fields.assignee.name",
                        "none"
                      )}|*${get(
                        jiraJson,
                        "fields.assignee.displayName",
                        "none"
                      )}*>`
                }       Priority: *${get(
                  jiraJson,
                  "fields.priority.name",
                  "none"
                )}*`,
                footer: `<${process.env.JIRA_PROJECT_PREFIX}${get(
                  jiraJson,
                  "fields.project.key"
                )}|${get(jiraJson, "fields.project.name")}> | <${
                  process.env.JIRA_MAIN_URL
                }|${process.env.JIRA_OUTER_CONTEXT_TEXT}>`,
                footer_icon:
                  "https://emoji.slack-edge.com/T01094KTUES/jira_alien_spaceship/dcaf93460f86f468.png"
              }
            ]
          });
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
};

module.exports = {
  jiraUnfurlCallback
};
