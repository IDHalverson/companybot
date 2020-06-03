const { app } = require("../../index");
const axios = require("axios");
const { get } = require("lodash");

const jiraUnfurlCallback = async ({ payload, context, ack }) => {
  try {
    ack && ack();
    // don't allow bot posts
    if (payload.text && (!payload.attachments || !payload.attachments.length)) {
      const jiraIdentifier = context.matches && context.matches[0];
      if (jiraIdentifier) {
        const jiraApiUrl = `${process.env.JIRA_API_URL_PREFIX}${jiraIdentifier}`;
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
          console.log(payload, context);
          app.client.chat.postMessage({
            token: context.botToken,
            channel: payload.channel,
            icon_emoji: ":jira:",
            username: "JIRA",
            reply_broadcast: false,
            thread_ts: payload.thread_ts,
            attachments: [
              {
                color: "205081",
                fields: [
                  {
                    title: "Assignee",
                    value: get(
                      jiraJson,
                      "fields.assignee.displayName",
                      "(none)"
                    ),
                    short: true
                  },
                  {
                    title: "Status",
                    value: get(jiraJson, "fields.status.name", "(none)"),
                    short: true
                  }
                  //   ,
                  //   {
                  //     title: "Creator",
                  //     value: get(jiraJson, "fields.creator.displayName", "?"),
                  //     short: true
                  //   }
                ],
                title: `[${jiraIdentifier}] ${get(
                  jiraJson,
                  "fields.summary",
                  "?"
                )}`,
                title_link: jiraBrowseUrl
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
