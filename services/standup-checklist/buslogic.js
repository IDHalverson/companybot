const { app } = require("../../index");
const { get, uniq, attempt } = require("lodash");
const TEMPLATES = require("./templates");

const isStandupMessage = (messageUsername, messageText) =>
  (messageUsername &&
    messageUsername === "Standup Checklist") ||
  (messageText &&
    messageText.startsWith("(automatically posted at 9:15am)"));

const getStandupUsers = async (context, devOverrideToken) => {
  const userIds = process.env.STANDUP_USER_IDS.split(",");

  const userResps = await Promise.all(userIds.map(userId => app.client.users.info({
    token: devOverrideToken || context.botToken,
    user: userId
  })))
  const users = userResps.map(resp => resp.user);

  const usersInOrder = userIds.map(userId => users.find(user => user.id === userId)).filter(user => !user.deleted);

  return usersInOrder;
}

const bscpStandupSlashCommandCallback = async ({ command, devOverrideChannelId, context, devOverrideToken, ack, isAutomated = false }) => {
  try {
    await (ack && ack());
    console.log("Creating Standup checklist");

    const usersInOrder = await getStandupUsers(context, devOverrideToken);

    const approximateTimestamp = Date.now();

    // Note: when devOverrideToken is an admin token, it will not post
    // as the bot. It will post as the admin user.
    await app.client.chat.postMessage({
      token: devOverrideToken || context.botToken,
      username: "Standup Checklist",
      icon_emoji: ":mega:",
      channel: devOverrideChannelId || command.channel_id,
      text: TEMPLATES.standupTemplate(usersInOrder, isAutomated)
    });

    const messages = await app.client.conversations.history({
      token: devOverrideToken || context.botToken,
      channel: devOverrideChannelId || command.channel_id,
      inclusive: true,
      limit: 1,
      latest: approximateTimestamp
    });
    const messageUsername = get(messages, "messages[0].username");
    const messageText = get(messages, "messages[0].text");
    const messageTS = get(messages, "messages[0].ts");

    if (
      isStandupMessage(messageUsername, messageText)
    ) {
      await app.client.chat.postMessage({
        token: devOverrideToken || context.botToken,
        username: messageUsername,
        icon_emoji: ":mega:",
        channel: devOverrideChannelId || command.channel_id,
        text: TEMPLATES.standupHelperText(usersInOrder, isAutomated),
        thread_ts: messageTS
      });
    }
  } catch (e) {
    console.error(e)
  }
};

const someoneHasGoneCallback = (overrideMatchText) => async ({ payload, context, ack }) => {
  try {
    ack && (await ack());
    const userIdentifier = get(context, "matches[1]");
    const actionText = overrideMatchText || get(context, "matches[0]");
    // EARLY RETURN
    if ((get(context, "matches.input")).startsWith("*Usage: *")) return;
    const messages = await app.client.conversations.history({
      token: context.botToken,
      channel: payload.channel,
      inclusive: true,
      limit: 1,
      latest: payload.thread_ts
    });
    const messageText = get(messages, "messages[0].text");
    const messageUsername = get(messages, "messages[0].username");
    if (
      payload.thread_ts &&
      isStandupMessage(messageUsername, messageText)
    ) {
      console.log(`Applying command to Standup checklist: ${actionText}`);
      const deleteIt =
        actionText.includes("self-destruct") ||
        actionText.includes("self destruct");

      let identifierToReport = userIdentifier;
      let matchedUsers;

      if (!deleteIt) {

        const usersInOrder = await getStandupUsers(context);

        const getMatchedUsers = attempt => {
          const matchedUs = usersInOrder.filter(user => {
            const [firstName, lastName] = (user.real_name || "").split(" ");
            const firstInitial = firstName.charAt(0);
            const lastInitial = lastName.charAt(0);
            const variations = [
              `${firstName} ${lastName}`,
              `${firstName}`,
              `${lastName}`,
              `${firstInitial} ${lastInitial}`,
              `${firstInitial}. ${lastInitial}.`,
              `${firstInitial}. ${lastInitial}`,
              `${firstInitial} ${lastInitial}.`,
              `${firstInitial}. ${lastName}`,
              `${firstInitial} ${lastName}`,
              `${firstName} ${lastInitial}.`,
              `${firstName} ${lastInitial}`,
              `${firstInitial}`,
              `${lastInitial}`
            ];
            return variations.some(variation => [
              variation,
              variation.replace(/\s/g, "")
            ].filter(Boolean).some(innerVariation => (
              innerVariation.toLowerCase() === attempt.toLowerCase()
            )))
          });
          return matchedUs;
        }

        // Try with full text, if nothing, try only first word
        matchedUsers = getMatchedUsers(userIdentifier);
        if (!matchedUsers.length) {
          identifierToReport = userIdentifier.split(" ")[0];
          matchedUsers = getMatchedUsers(userIdentifier.split(" ")[0]);
        }

        if (matchedUsers.length > 1) {
          await app.client.chat.postMessage({
            token: context.botToken,
            username: ".",
            icon_emoji: ":warning:",
            channel: payload.channel,
            text: `Text '${identifierToReport}' matches more than 1 user.\n${matchedUsers.map(u => `\`${u.real_name}\``).join(", ")}`,
            thread_ts: payload.thread_ts
          });
          return;
        } else if (matchedUsers.length === 0) {
          await app.client.chat.postMessage({
            token: context.botToken,
            username: ".",
            icon_emoji: ":warning:",
            channel: payload.channel,
            text: "Text did not match any user.",
            thread_ts: payload.thread_ts
          });
          return;
        }
      }

      const userFullName = matchedUsers ? matchedUsers[0].real_name : "";

      const isCheckOffEvent = messageText.match(
        new RegExp(`\\:black_small_square\\:[\\s]{0,2}${userFullName}`)
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
            text: `${messageText
              .replace(
                new RegExp(
                  `\\:[a-z0-9\\_\\-]+\\:\\s(\\~)?${userFullName}(\\~)?(\\n)?`
                ),
                ""
              )}\n${(actionText.includes("check off")
                ? `:heavy_check_mark: ~${userFullName}~`
                : actionText.includes("where is")
                  ? `:questionblock: ~${userFullName}~`
                  : actionText.toLowerCase().includes("is on pto")
                    ? `:beach: ~${userFullName}~`
                    : actionText.includes("is out sick")
                      ? `:face_with_thermometer: ~${userFullName}~`
                      : actionText.includes("is busy")
                        ? `:cattyping: ~${userFullName}~`
                        : `:black_small_square: ${userFullName}`)}`
          };
      } else if (isUncheckEvent) {
        textObj = deleteIt
          ? {}
          : {
            text: `:black_small_square: ${userFullName}\n${messageText
              .replace(
                new RegExp(
                  `\\:[a-z0-9\\_\\-]+\\:\\s(\\~)?${userFullName}(\\~)?(\\n)?`
                ),
                ""
              )}`
          };
      } else if (isChangeEvent) {
        textObj = deleteIt
          ? {}
          : {
            text: messageText.replace(
              new RegExp(
                `\\:[a-z0-9\\_\\-]+\\:\\s(\\~)?${userFullName}(\\~)?(\\n)?`
              ),
              (actionText.includes("check off")
                ? `:heavy_check_mark: ~${userFullName}~`
                : actionText.includes("where is")
                  ? `:questionblock: ~${userFullName}~`
                  : actionText.toLowerCase().includes("is on pto")
                    ? `:beach: ~${userFullName}~`
                    : actionText.includes("is out sick")
                      ? `:face_with_thermometer: ~${userFullName}~`
                      : actionText.includes("is busy")
                        ? `:cattyping: ~${userFullName}~`
                        : actionText.includes("uncheck")
                          ? `:black_small_square: ${userFullName}`
                          : `:black_small_square: ${userFullName}`) + "\n"
            )
          };
      }

      await app.client.chat[deleteIt ? "delete" : "update"]({
        token: process.env.ADMIN_USER_TOKEN,
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

const respondToBscpStandupWorkflowStep = {
  edit: async ({ ack, step, configure }) => {
    await ack();
    await configure({
      blocks: [{
        type: 'section',
        text: {
          type: "plain_text",
          text: 'Click save.'
        }
      }]
    })
  },
  save: async ({ ack, step, update }) => {
    await ack();
    await update({ inputs: {}, outputs: [] })
  },
  execute: async ({ step, complete, fail }) => {
    console.log("execute!")
    await bscpStandupSlashCommandCallback({
      devOverrideToken: process.env.ADMIN_USER_TOKEN,
      devOverrideChannelId: process.env.STANDUP_CHECKLIST_CHANNEL,
      isAutomated: true
    })
    await complete({ outputs: {} })
  },
}

module.exports = {
  bscpStandupSlashCommandCallback,
  someoneHasGoneCallback,
  respondToBscpStandupWorkflowStep
};
