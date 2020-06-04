const { app } = require("../../index");
const { get } = require("lodash");

const bscpStandupSlashCommandCallback = async ({ command, context, ack }) => {
  await ack();
  console.log("Creating Standup checklist");
  await app.client.chat.postMessage({
    token: context.botToken,
    username: "Standup Checklist",
    icon_emoji: ":mega:",
    channel: command.channel_id,

    text: `Who needs to give their update:
    
    :black_small_square: <@U01094ZKHL6>
    :black_small_square: <@UV9EGMVEF>
    :black_small_square: <@U010A59KWHM>
    :black_small_square: <@U01089U0MRT>
    :black_small_square: <@U0108UU2TJT>
    :black_small_square: <@U0107R9Q01J>
    :black_small_square: <@U010A59HEQP>
    :black_small_square: <@U0107R9NT8U>
    :black_small_square: <@UBYEG09K7>
    :black_small_square: <@UBYH4BM2R>
    :black_small_square: <@UM4749Q6B>
    :black_small_square: <@UBYD0UKQA>
    :black_small_square: <@U010A59LGMV>`
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
      await app.client.chat.update({
        token: context.botToken,
        channel: payload.channel,
        ts: payload.thread_ts,
        as_user: true,
        text: messageText.replace(
          new RegExp(`\\:[a-z0-9\\_\\-]+\\:\\s(\\~)?\\<\\@${userId}\\>(\\~)?`),
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
      });
    }
  } catch (e) {
    console.error(e);
  }
};

module.exports = {
  bscpStandupSlashCommandCallback,
  someoneHasGoneCallback
};
