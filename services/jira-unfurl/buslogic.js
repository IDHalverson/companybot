const { app } = require("../../index");
const axios = require("axios");
const TEMPLATES = require("./templates");

const jiraUnfurlCallback = async ({ command, payload, context, ack }) => {
  try {
    ack && (await ack());
    // don't allow bot posts
    if (
      payload.text &&
      (!payload.subtype || payload.subtype !== "bot_message")
    ) {
      const jiraIdentifier =
        command.text || (context.matches && context.matches[0]);
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
            `JIRA unfurl: ${jiraIdentifier} in channel ${
              command.channel_id || payload.channel
            }`
          );
          let postParams = {
            token: context.botToken,
            icon_emoji: ":jira:",
            username: "JIRA",
            attachments: TEMPLATES.jiraUnfurlAttachments(
              jiraJson,
              jiraBrowseUrl,
              jiraIdentifier
            )
          };
          if (command && command.text) {
            postParams = {
              ...postParams,
              response_type: "in_channel"
            };
            axios.post(command.response_url, postParams);
          } else {
            postParams = {
              ...postParams,
              channel: payload.channel,
              reply_broadcast: false,
              thread_ts: payload.thread_ts
            };
            app.client.chat.postMessage(postParams);
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
};

const jiraUnfurlDetailedCallback = async ({
  command,
  payload,
  context,
  ack
}) => {
  try {
    ack && (await ack());
    const jiraIdentifier = command.text;
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
          `JIRA unfurl: ${jiraIdentifier} in channel ${
            command.channel_id || payload.channel
          }`
        );
        let postParams = {
          token: context.botToken,
          icon_emoji: ":jira:",
          username: "JIRA",
          attachments: TEMPLATES.jiraDetailedAttachments(
            jiraJson,
            jiraBrowseUrl,
            jiraIdentifier
          )
        };
        if (command && command.text) {
          postParams = {
            ...postParams,
            response_type: "in_channel"
          };
          axios.post(command.response_url, postParams);
        } else {
          postParams = {
            ...postParams,
            channel: payload.channel,
            reply_broadcast: false,
            thread_ts: payload.thread_ts
          };
          app.client.chat.postMessage(postParams);
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
};

module.exports = {
  jiraUnfurlCallback,
  jiraUnfurlDetailedCallback
};
