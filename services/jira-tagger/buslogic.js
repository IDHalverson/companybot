const { app } = require("../../index");

/* ASYNC METHODS */

const jiraTagger = async ({ context, payload }) => {
  if (isPossibleJiraTag(payload)) {
    const mappingEntries = resolveJiraNotifyMappings();
    for (let mappingEntry of mappingEntries) {
      const { jiraUsername, slackMemberId, deliveryMethod } = mappingEntry;
      if (userWasTaggedInJiraMessage(payload, jiraUsername)) {
        try {
          console.log(
            `JIRA Tagger: tagged user ${jiraUsername} with method ${deliveryMethod} (ID: ${slackMemberId})`
          );
          await app.client.chat.postMessage(
            resolveParams(
              deliveryMethod,
              context,
              payload,
              jiraUsername,
              slackMemberId
            )
          );
        } catch (e) {
          console.error(e.stack);
        }
      }
    }
  }
};

module.exports = { jiraTagger };

/* UTIL METHODS */

const resolveParams = (
  deliveryMethod,
  context,
  payload,
  jiraUsername,
  slackMemberId
) => {
  const jiraRegexp = new RegExp(`\\[\\~${jiraUsername}\\]`, "g");
  let params = {
    token: context.botToken,
    channel: payload.channel,
    text: "",
    icon_emoji: ":jira:",
    username: "JIRA Tagger",
    thread_ts: payload.ts,
    attachments: payload.attachments.map((att) => ({
      ...att,
      text: !att.text
        ? att.text
        : att.text.replace(jiraRegexp, `<@${slackMemberId}>`)
    }))
  };
  if (deliveryMethod === "message_thread") {
    // do nothing
  } else if (deliveryMethod === "post_message") {
    delete params.thread_ts;
  } else if (deliveryMethod === "direct_message") {
    params = {
      token: params.token,
      channel: slackMemberId,
      text: params.text,
      attachments: params.attachments
    };
  }
  return params;
};

const resolveJiraNotifyMappings = () => {
  const jiraNotifyMappingsENV = process.env.JIRA_NOTIFY_MAPPINGS || "";
  const jiraNotifyMappings = jiraNotifyMappingsENV.split(",");
  const mappingEntries = jiraNotifyMappings.map((jNM) => {
    const [
      jiraUsername,
      slackMemberId,
      deliveryMethod = "message_thread"
    ] = jNM.split(":");
    return {
      jiraUsername,
      slackMemberId,
      deliveryMethod
    };
  });
  return mappingEntries;
};

const isPossibleJiraTag = (payload) => payload && !!payload.attachments;

const userWasTaggedInJiraMessage = (payload, jiraUsername) =>
  payload &&
  payload.attachments &&
  payload.attachments.some(
    (att) => att && att.text && att.text.includes(`[~${jiraUsername}]`)
  );
