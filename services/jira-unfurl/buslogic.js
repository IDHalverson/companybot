const { app } = require("../../index");
const axios = require("axios");
const TEMPLATES = require("./templates");
const { get } = require("lodash");

const jiraUnfurlCallback = async ({ command, payload, context, ack }) => {
  try {
    ack && (await ack());
    // don't allow bot posts
    if (
      payload.text &&
      (!payload.subtype || payload.subtype !== "bot_message")
    ) {
      const jiraIdentifierMatches = (
        (command && command.text) ||
        (payload && payload.text)
      ).match(/((?<!([A-Z]{1,10})-?)[A-Z0-9]+-\d+)/g);
      const alreadySentMap = {};
      await jiraIdentifierMatches.forEach(async (jiraIdentifier) => {
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
          let comment;
          const text = (command && command.text) || (payload && payload.text);
          const commentMatch = text.match(/#comment-([0-9]+)/);
          if (commentMatch && commentMatch[1]) {
            comment = (get(jiraJson, "fields.comment.comments", []) || []).find(
              (comm) => comm.id == commentMatch[1]
            );
          }
          let postParams = {
            token: context.botToken,
            icon_emoji: ":jira:",
            username: "JIRA",
            attachments: TEMPLATES.jiraUnfurlAttachments(
              jiraJson,
              jiraBrowseUrl,
              jiraIdentifier,
              comment
            )
          };
          const key = `${jiraIdentifier}${comment ? "_comment" : ""}`;
          if (!alreadySentMap[key]) {
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
          alreadySentMap[key] = true;
        }
      });
    }
  } catch (e) {
    console.error(e.stack);
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
    const jiraIdentifiers = command.text.match(
      /((?<!([A-Z]{1,10})-?)[A-Z0-9]+-\d+)/g
    );
    await jiraIdentifiers.forEach(async (jiraIdentifier) => {
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
    });
  } catch (e) {
    console.error(e.stack);
  }
};

module.exports = {
  jiraUnfurlCallback,
  jiraUnfurlDetailedCallback
};
