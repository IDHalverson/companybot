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
      messageText.includes("BSCP Standup:")
    ) {
      console.log(`Applying command to Standup checklist: ${actionText}`);
      const deleteIt =
        actionText.includes("self-destruct") ||
        actionText.includes("self destruct");

      const isCheckOffEvent = messageText.match(
        new RegExp(`\\:black_small_square\\:[\\s]{0,2}\\<\\@${userId}\\>`)
      );
      // Early return!
      if (actionText.includes("uncheck") && isCheckOffEvent) return;
      const isUncheckEvent = !isCheckOffEvent && actionText.includes("uncheck");
      const isChangeEvent = !isCheckOffEvent && !actionText.includes("uncheck");

      let textObj;
      if (isCheckOffEvent) {
        textObj = deleteIt
          ? {}
          : {
              text: messageText
                .replace(
                  new RegExp(
                    `\\:[a-z0-9\\_\\-]+\\:\\s(\\~)?\\<\\@${userId}\\>(\\~)?\\n`
                  ),
                  ""
                )
                .replace(
                  /\n\n\*commands:/,
                  "\n" +
                    (actionText.includes("check off")
                      ? `:heavy_check_mark: ~<@${userId}>~`
                      : actionText.includes("where is")
                      ? `:questionblock: ~<@${userId}>~`
                      : actionText.includes("vacation")
                      ? `:beach: ~<@${userId}>~`
                      : actionText.includes("is taking a sick day")
                      ? `:face_with_thermometer: ~<@${userId}>~`
                      : actionText.includes("is busy")
                      ? `:cattyping: ~<@${userId}>~`
                      : `:black_small_square: <@${userId}>`) +
                    "\n\n*commands:"
                )
            };
      } else if (isUncheckEvent) {
        textObj = deleteIt
          ? {}
          : {
              text: messageText
                .replace(
                  new RegExp(
                    `\\:[a-z0-9\\_\\-]+\\:\\s(\\~)?\\<\\@${userId}\\>(\\~)?\\n`
                  ),
                  ""
                )
                .replace(
                  /\*BSCP Standup:\*\n\n/,
                  "*BSCP Standup:*\n\n" + `:black_small_square: <@${userId}>\n`
                )
            };
      } else if (isChangeEvent) {
        textObj = deleteIt
          ? {}
          : {
              text: messageText.replace(
                new RegExp(
                  `\\:[a-z0-9\\_\\-]+\\:\\s(\\~)?\\<\\@${userId}\\>(\\~)?\\n`
                ),
                (actionText.includes("check off")
                  ? `:heavy_check_mark: ~<@${userId}>~`
                  : actionText.includes("where is")
                  ? `:questionblock: ~<@${userId}>~`
                  : actionText.includes("vacation")
                  ? `:beach: ~<@${userId}>~`
                  : actionText.includes("is taking a sick day")
                  ? `:face_with_thermometer: ~<@${userId}>~`
                  : actionText.includes("is busy")
                  ? `:cattyping: ~<@${userId}>~`
                  : actionText.includes("uncheck")
                  ? `:black_small_square: <@${userId}>`
                  : `:black_small_square: <@${userId}>`) + "\n"
              )
            };
      }

      await app.client.chat[deleteIt ? "delete" : "update"]({
        token: context.botToken,
        channel: payload.channel,
        ts: payload.thread_ts,
        as_user: true,
        ...textObj
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
