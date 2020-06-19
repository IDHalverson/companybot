const { app } = require("../../index");
const { get } = require("lodash");
const TEMPLATES = require("./templates");

const bscpStandupSlashCommandCallback = async ({ command, context, ack }) => {
  await ack();
  console.log("Creating Standup checklist");
  await app.client.chat.postMessage({
    token: context.botToken,
    username: "Standup Checklist",
    icon_emoji: ":mega:",
    channel: command.channel_id,
    text: TEMPLATES.standupTemplate(process.env.STANDUP_USER_IDS.split(","))
  });
};

const someoneHasGoneCallback = async ({ payload, context, ack }) => {
  try {
    ack && (await ack());
    const userId = get(context, "matches[1]");
    const actionText = get(context, "matches[0]");
    const messages = await app.client.conversations.history({
      token: context.botToken,
      channel: payload.channel,
      inclusive: true,
      limit: 1,
      latest: payload.thread_ts
    });
    const messageText = get(messages, "messages[0].text");
    if (
      payload.thread_ts &&
      messageText &&
      messageText.includes("Who needs to give their update")
    ) {
      console.log(`Applying command to Standup checklist: ${actionText}`);
      const deleteIt = actionText.includes("self-destruct");
      await app.client.chat[deleteIt ? "delete" : "update"]({
        token: context.botToken,
        channel: payload.channel,
        ts: payload.thread_ts,
        as_user: true,
        ...(deleteIt
          ? {}
          : {
              text: messageText.replace(
                new RegExp(
                  `\\:[a-z0-9\\_\\-]+\\:\\s(\\~)?\\<\\@${userId}\\>(\\~)?`
                ),
                actionText.includes("check off")
                  ? `:heavy_check_mark: ~<@${userId}>~`
                  : actionText.includes("where is")
                  ? `:questionblock: ~<@${userId}>~`
                  : actionText.includes("is on vacation")
                  ? `:beach: ~<@${userId}>~`
                  : actionText.includes("uncheck")
                  ? `:black_small_square: <@${userId}>`
                  : `:black_small_square: <@${userId}>`
              )
            })
      });
    }
  } catch (e) {
    console.error(e.stack);
  }
};

module.exports = {
  bscpStandupSlashCommandCallback,
  someoneHasGoneCallback
};
