const { app } = require("../../index");
const TEMPLATES = require("./templates");
const axios = require("axios");
// const nodemailer = require("nodemailer");
const { get, cloneDeep, uniq } = require("lodash");
const moment = require("moment");

const moveToThreadMessageShortcutCallback = async ({
    context,
    ack,
    body,
    payload
}) => {
    await ack()

    await app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: TEMPLATES.getStartMessageForm(
            payload,
            context,
        )
    });


}

const moveToThreadFormSubmissionCallback = async ({
    context,
    ack,
    body,
    payload
}) => {
    await ack()

    const startMessageLink = get(
        payload,
        "state.values.start_msg_lnk.start_msg_lnk_value.value"
    );

    const threadName = get(
        payload,
        "state.values.thread_title.thread_title_value.value"
    );

    const convoCategory = get(
        payload,
        "state.values.conversation_category.conversation_category_value.selected_option.value"
    );

    const doDeleteVal = get(
        payload,
        "state.values.delete_messages.delete_messages_value.selected_option.value"
    );
    const doDelete = doDeleteVal === "true" ? true : false;

    if (!startMessageLink || !startMessageLink.match(/^http[s]*\:\/\/burris\-logistics\.slack\.com\/archives\//)) {
        return app.client.chat.postEphemeral({
            token: context.botToken,
            channel: payload.private_metadata.split("<?sep>")[1],
            text: `Not a valid Slack message link${startMessageLink ? `: "${startMessageLink}"` : ""}`,
            user: payload.private_metadata.split("<?sep>")[2]
        })
    } else {
        const stuff = await axios.request(startMessageLink);

        const header = get(stuff, "request._header")
        const headerMatch = header && header.match(/\%2Fp(\d+)/)
        const startMessageTs = headerMatch && headerMatch[1] && Number(headerMatch[1]) / 1000;

        const [latestAsText, channelId, originalUserId] = payload.private_metadata.split("<?sep>");
        const latest = Number(latestAsText) * 1000;

        const conversation = { messages: [] }

        let conversationResp = await app.client.conversations.history({
            token: process.env.ADMIN_USER_TOKEN,
            channel: channelId,
            latest: (latest / 1000) + 1,
            oldest: (startMessageTs / 1000),
            inclusive: true,
            limit: 200
        });
        let nextCursor = conversationResp.response_metadata && conversationResp.response_metadata.next_cursor;
        conversation.messages = conversation.messages.concat(cloneDeep(conversationResp.messages));
        while (conversationResp.has_more && nextCursor) {
            conversationResp = await app.client.conversations.history({
                token: process.env.ADMIN_USER_TOKEN,
                channel: channelId,
                latest: (latest / 1000) + 1,
                oldest: (startMessageTs / 1000),
                inclusive: true,
                limit: 200,
                cursor: nextCursor
            });
            nextCursor = conversationResp.response_metadata && conversationResp.response_metadata.next_cursor;
            conversation.messages = conversation.messages.concat(cloneDeep(conversationResp.messages));
        }

        const messagesFiltered = conversation.messages.reverse().filter(message =>
            (!message.thread_ts || (message.thread_ts === message.ts))
            && !message.bot_id
            && message.subtype !== "channel_join"
            && Boolean(message.text)
        );
        const firstMessage = messagesFiltered[0]

        if (!firstMessage) return app.client.chat.postEphemeral({
            token: context.botToken,
            channel: channelId,
            text: "No messages in that range were qualified for thread-ifying.",
            user: originalUserId
        })

        const workspace = { users: [] }
        let allUsersResp = await app.client.users.list({
            token: process.env.ADMIN_USER_TOKEN,
            limit: 100
        });
        let nextUsersCursor = allUsersResp.response_metadata && allUsersResp.response_metadata.next_cursor;
        workspace.users = workspace.users.concat(cloneDeep(allUsersResp.members));
        while (allUsersResp.has_more && nextUsersCursor) {
            allUsersResp = await app.client.users.list({
                token: process.env.ADMIN_USER_TOKEN,
                limit: 100,
                cursor: nextUsersCursor
            });
            nextUsersCursor = allUsersResp.response_metadata && allUsersResp.response_metadata.next_cursor;
            workspace.users = workspace.users.concat(cloneDeep(allUsersResp.members));
        }

        const idsOfUsersNeeded = uniq(messagesFiltered.map(message => message.user));

        const fullNamesMapped = workspace.users.filter(user => idsOfUsersNeeded.includes(user.id)).reduce((obj, user) => {
            obj[user.id] = user.real_name
            return obj;
        }, {})

        const resp = await app.client.chat.postMessage({
            token: context.botToken,
            channel: channelId,
            text: `*:thread2: Automatically Generated Thread :thread2: ${convoCategory}: ${threadName}* \n\n\`${fullNamesMapped[firstMessage.user]}:\` ${firstMessage.text.substring(0, 150)}... \`[continued in thread]\``
                .replace(/\<\@(U[A-Z0-9]{8,12})\>/g, (_, userId) => {
                    return "@ " + fullNamesMapped[userId]
                }),
            parse: "full"
        });
        const threadTs = resp.ts;

        let mostRecentUserHeading;
        let threadMessageText = ""
        let mostRecentDateHeading;
        let lastMessageTime;

        let index = 0;
        for (let message of messagesFiltered) {
            let prefix = "";
            const user = message.user;
            const mom = moment(message.ts * 1000);
            const date = mom.format("MM/DD/YYYY");

            let newDateGotPosted = false;
            if (mostRecentDateHeading !== date) {
                newDateGotPosted = true;
                prefix += `\n\n \`------ ${date} ------\` \n\n`;
                mostRecentDateHeading = date;
            }

            if (newDateGotPosted || mostRecentUserHeading !== user || !messagesFiltered[index + 1]) {
                const startTimeMatch = threadMessageText.match(/([0-9]{1,2}\:[0-9]{1,2}[ap]m)\<\<insertEndTime\>\>/);
                const startTime = startTimeMatch && startTimeMatch[1];
                if (lastMessageTime && startTime !== lastMessageTime) {
                    threadMessageText = threadMessageText.replace("<<insertEndTime>>", `-${lastMessageTime}`);
                } else {
                    threadMessageText = threadMessageText.replace("<<insertEndTime>>", "");
                }
            }

            if (newDateGotPosted || mostRecentUserHeading !== user) {
                prefix += `\`${fullNamesMapped[user]}:\` _${mom.format("h:mma")}<<insertEndTime>>_\n\n`
                mostRecentUserHeading = user
            }

            lastMessageTime = mom.format("h:mma");
            threadMessageText += `${prefix}${message.text}\n\n`;
            index++
        }
        const startTimeMatch = threadMessageText.match(/([0-9]{1,2}\:[0-9]{1,2}[ap]m)\<\<insertEndTime\>\>/);
        const startTime = startTimeMatch && startTimeMatch[1];
        if (lastMessageTime && startTime !== lastMessageTime) {
            threadMessageText = threadMessageText.replace("<<insertEndTime>>", `-${lastMessageTime}`);
        } else {
            threadMessageText = threadMessageText.replace("<<insertEndTime>>", "");
        }

        await app.client.chat.postMessage({
            token: context.botToken,
            channel: channelId,
            text: threadMessageText.replace(/\<\@(U[A-Z0-9]{8,12})\>/g, (_, userId) => {
                return "@ " + fullNamesMapped[userId]
            }),
            parse: "full",
            thread_ts: threadTs
        })

        if (doDelete) {
            const messagesToDelete = messagesFiltered.filter(message => !message.thread_ts).map(message => message.ts);
            for (let tsToDelete of messagesToDelete) {
                await app.client.chat.delete({
                    token: process.env.ADMIN_USER_TOKEN,
                    channel: channelId,
                    ts: tsToDelete,
                    //as_user: true
                })
            }
        }
    }
}


module.exports = {
    moveToThreadMessageShortcutCallback,
    moveToThreadFormSubmissionCallback
}