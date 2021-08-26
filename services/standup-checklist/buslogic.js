const { app } = require("../../index");
const { get, uniq, attempt } = require("lodash");
const TEMPLATES = require("./templates");
const moment = require("moment");

const isStandupMessage = (messageUsername, messageText) =>
  (messageUsername &&
    messageUsername === "Standup Checklist") ||
  (messageText &&
    messageText.startsWith("(automatically posted"));
// Uncomment this to temporarily do cleanup of already deleted checklists
// || messageText.startsWith("This message was deleted.");

const isUsageMessage = (context) => (get(context, "matches.input")).startsWith("*Usage: *")

const didBotPost = (messageUsername) => messageUsername === "Standup Checklist";

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

    throw new Error("testing!!!")

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
        username: ".",
        icon_emoji: ":information_source:",
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
    if (isUsageMessage(context)) return;
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
      const wasAutomatic = messageText.includes("(automatically posted");
      const inp = get(context, "matches.input");
      const deleteIt =
        [
          "self-destruct",
          "self destruct",
          "destroy",
          "delete list",
          "delete-list",
          "delete checklist",
          "delete-checklist",
        ].some(keyTerm => actionText.includes(keyTerm)) ||
        [
          "sd",
          "s-d",
          "dc",
          "dl",
          "d",
          "delete"
        ].includes(inp); //entire input === this

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
            text: `${wasAutomatic
              ? "(automatically posted)\n\n"
              : ""}:black_small_square: ${userFullName}\n${messageText
                .replace(
                  new RegExp(
                    `\\:[a-z0-9\\_\\-]+\\:\\s(\\~)?${userFullName}(\\~)?(\\n)?`
                  ),
                  ""
                ).replace(/\(automatically posted\)\n\n/g, "")}`
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

      let replies = { messages: [] };
      let todaysMessages = { messages: [] };
      if (deleteIt) {
        try {
          replies = await app.client.conversations.replies({
            token: context.botToken,
            channel: payload.channel,
            ts: payload.thread_ts
          });
        } catch (e) {
          if (e.message.includes("thread_not_found")) {
            // do nothing
          } else {
            throw e;
          }
        }
        todaysMessages = await app.client.conversations.history({
          token: context.botToken,
          channel: payload.channel,
          inclusive: true,
          oldest: ((Number(payload.thread_ts) + 60) - 14400), // 4 hours prior
          limit: 300
        });
      }

      const botPosted = didBotPost(messageUsername);

      try {
        await app.client.chat[deleteIt ? "delete" : "update"]({
          token: botPosted ? context.botToken : process.env.ADMIN_USER_TOKEN,
          channel: payload.channel,
          ts: payload.thread_ts,
          as_user: true,
          ...textObj
        });
      } catch (e) {
        if (deleteIt && e.message.includes("message_not_found")) {
          // do nothing
        } else {
          throw e;
        }
      }

      // re-usable function
      const deleteReplies = async (repliesResp, onlyIfAllBotMessages = false) => {
        if (onlyIfAllBotMessages && get(repliesResp, "messages").some(r => r.subtype !== "bot_message")) {
          /* EARLY RETURN */ return true; // there was user conversation
        }
        for (let reply of get(repliesResp, "messages")) {
          if (reply.ts !== payload.thread_ts /* already deleted */ && !reply.hidden) {
            try {
              await app.client.chat.delete({
                token: process.env.ADMIN_USER_TOKEN,
                channel: payload.channel,
                ts: reply.ts,
              })
            } catch (e) {
              if (e.message.includes("message_not_found")) {
                // do nothing
              } else {
                errors.push(e)
              }
            }
          }
        }
      }

      const errors = [];
      const skippedDueToPossibleUserConversation = [];
      if (deleteIt) {

        await deleteReplies(replies)

        for (let todayMessage of get(todaysMessages, "messages")) {
          const isStandupBot = (todayMessage.subtype === "bot_message" && [
            "Standup Checklist",
            "Standup Update",
            "BSCP Standup2",
            "BSCP Standup1",
            "BSCP Standup3",
            "Weekly Planning Meeting1",
            "Weekly Planning Meeting2",
            "Ack",
          ].includes(todayMessage.username));
          const isAutomaticAdminStandupMessage = (
            (todayMessage.text || "").includes("(automatically posted") && todayMessage.username === "Ian Halverson"
          );

          if ((isStandupBot || isAutomaticAdminStandupMessage) && !todayMessage.hidden) {

            let wasThereUserConversation = false;
            if ((todayMessage.reply_count || 0) > 0) {
              try {
                const todayMessageRepliesResp = await app.client.conversations.replies({
                  token: context.botToken,
                  channel: payload.channel,
                  ts: todayMessage.ts
                });
                wasThereUserConversation = await deleteReplies(todayMessageRepliesResp, true)
              } catch (e) {
                if (e.message.includes("thread_not_found")) {
                  // do nothing
                } else {
                  errors.push(e)
                }
              }
            }

            try {
              if (!wasThereUserConversation) {
                await app.client.chat.delete({
                  token: process.env.ADMIN_USER_TOKEN,
                  channel: payload.channel,
                  ts: todayMessage.ts,
                })
              } else {
                skippedDueToPossibleUserConversation.push(todayMessage.text)
              }
            } catch (e) {
              if (e.message.includes("message_not_found")) {
                // do nothing
              } else {
                errors.push(e)
              }
            }
          }
        }

        if (skippedDueToPossibleUserConversation.length) {
          const notifyText = "During deletion, these were skipped due to user conversation preservation:"
            + `\n\n${skippedDueToPossibleUserConversation.map(s => `${s.substring(0, 75)} [.....]`).join("\n\`--------\`\n")}`
          console.log(notifyText);
          await app.client.chat.postEphemeral({
            token: process.env.ADMIN_USER_TOKEN,
            channel: payload.channel,
            user: payload.user,
            text: notifyText,
            attachments: []
          })
        }

        if (errors.length) {
          errors.forEach(e => {
            console.error(e.stack)
          });
          await app.client.chat.postEphemeral({
            token: process.env.ADMIN_USER_TOKEN,
            channel: payload.channel,
            user: payload.user,
            text: errors.map(e => e.message).join("\n\n"),
            attachments: []
          })
        }
      }
    }
  } catch (e) {
    console.error(e.stack);
    await app.client.chat.postEphemeral({
      token: process.env.ADMIN_USER_TOKEN,
      channel: payload.channel,
      user: payload.user,
      as_user: false,
      username: "Error",
      icon_emoji: ":warning:",
      text: e.message,
      attachments: []
    })
  }
};

const respondToBscpStandupWorkflowStep = {
  edit: async ({ ack, step, configure }) => {
    await ack();
    await configure({
      blocks: [{
        type: 'input',
        block_id: 'password',
        element: {
          type: "plain_text_input",
          action_id: "password_text",
          placeholder: {
            type: "plain_text",
            text: "Enter password"
          }
        },
        label: {
          type: "plain_text",
          text: 'Type workflow step password then click save.'
        }
      }]
    })
  },
  save: async ({ ack, step, view, update }) => {
    await ack();
    const pass = get(view, "state.values.password.password_text.value");
    if (pass !== process.env.PASSWORD_TO_USE_CHECKLIST_WORKFLOW_STEP) {
      throw new Error("Unauthorized attempt to use automated BSCP checklist.")
    }
    await update({ inputs: {}, outputs: [] })
  },
  execute: async ({ step, complete, fail }) => {
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
