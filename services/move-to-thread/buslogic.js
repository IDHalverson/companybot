const { app } = require("../../index");
const TEMPLATES = require("./templates");
const axios = require("axios");
const { get, cloneDeep, uniq } = require("lodash");
const moment = require("moment");

// TODO: put a lot of things in CONSTANTS file.

// NOTE: private_metadata is used for the following:
// {the original shortcutted message timestamp} <?sep> {the channel ID} <?sep>
// {the user who clicked the shortcut's ID} <?sep> {the original payload response_url in case we need to post an ephemeral} <?sep>
// {true/false string as to whether the 'deliver to users' block has been opened}

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
            context
        )
    });


}

const moveToThreadFormSubmissionCallback = async ({
    context,
    ack,
    payload
}) => {
    await ack()

    const startMessageLink = get(
        payload,
        "state.values.start_msg_lnk.start_msg_lnk_value.value"
    );

    let threadName = get(
        payload,
        "state.values.thread_title.thread_title_value.value"
    );

    const convoCategory = get(
        payload,
        "state.values.conversation_category.conversation_category_value.selected_option.value"
    ) || "Discussion";

    const deleteMessagesKey = Object.keys(get(payload, "state.values.delete_messages") || {})[0];
    const doDeleteVal = get(
        payload,
        `state.values.delete_messages[${deleteMessagesKey}].selected_option.value`
    ) || "false";
    const doDelete = doDeleteVal === "true" ? true : false;

    const usersForDelivery = get(payload, "state.values.deliver_to_users.deliver_to_users_value.selected_users") || [];

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
            token: context.botToken,
            channel: channelId,
            latest: (latest / 1000) + 1, //Not sure why the addition is needed :/
            oldest: (startMessageTs / 1000), //Not sure why the addition is needed :/
            inclusive: true,
            limit: 200
        });
        let nextCursor = conversationResp.response_metadata && conversationResp.response_metadata.next_cursor;
        conversation.messages = conversation.messages.concat(cloneDeep(conversationResp.messages));
        while (conversationResp.has_more && nextCursor) {
            conversationResp = await app.client.conversations.history({
                token: context.botToken,
                channel: channelId,
                latest: (latest / 1000) + 1, //Not sure why the addition is needed :/
                oldest: (startMessageTs / 1000), //Not sure why the addition is needed :/
                inclusive: true,
                limit: 200,
                cursor: nextCursor
            });
            nextCursor = conversationResp.response_metadata && conversationResp.response_metadata.next_cursor;
            conversation.messages = conversation.messages.concat(cloneDeep(conversationResp.messages));
        }

        const messagesFiltered = conversation.messages.reverse().filter(message =>
            (!message.thread_ts || (message.thread_ts === message.ts))
            && message.subtype !== "channel_join"
            && Boolean(message.text) &&
            message.username !== "Garlic Thread"
        );
        const firstMessage = messagesFiltered[0]

        if (!threadName) threadName = `had on ${moment(firstMessage.ts * 1000).format("MM/DD/YYYY")}`

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

        const idsOfUsersNeeded = uniq(messagesFiltered.map(message => message.bot_id || message.user).concat(usersForDelivery));

        const fullNamesMapped = workspace.users.filter(user => idsOfUsersNeeded.includes((get(user, "profile.bot_id")) || user.id)).reduce((obj, user) => {
            obj[get(user, "profile.bot_id") || user.id] = user.real_name || get(user, "profile.real_name")
            return obj;
        }, {})

        const getName = (message) => {
            const name = fullNamesMapped[message.bot_id || message.user];
            if (!name) {
                if (message.bot_id) return "[Unidentified Bot]"
                else return "[Unidentifier User]"
            } else return name;
        }

        const resp = await app.client.chat.postMessage({
            token: context.botToken,
            channel: channelId,
            text: `:thread2: :thread2: :thread2: *${convoCategory}: ${threadName}* :thread2: :thread2: :thread2:\n\n *${getName(firstMessage)}*: ${firstMessage.text.substring(0, 100)}... [continued]`
                .replace(/\<\@(U[A-Z0-9]{8,12})\>/g, (_, userId) => {
                    return "*@ " + (fullNamesMapped[userId] || "[Unidentified User]") + "*"
                })
                .replace(/\<\!here\>/g, "*@ here*").replace(/\<\!channel\>/g, "*@ channel*"),
            unfurl_links: false,
            username: "Garlic Thread",
            icon_emoji: ":garlic_bread:"
        });
        const threadTs = resp.ts;

        let mostRecentUserHeading;
        let threadMessageText = ""
        let mostRecentDateHeading;
        let lastMessageTime;

        let index = 0;
        for (let message of messagesFiltered) {
            let prefix = "";
            const user = message.bot_id || message.user;
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
                const dateWithLink = doDelete ? `_${mom.format("h:mma")}<<insertEndTime>>_` :
                    `<https://burris-logistics.slack.com/archives/${channelId}/p${message.ts * 1000000}|_${mom.format("h:mma")}<<insertEndTime>>_>`
                prefix += `\`${getName(message)}:\` ${dateWithLink}\n\n`
                mostRecentUserHeading = user
            }

            lastMessageTime = mom.format("h:mma");
            threadMessageText += `${prefix}\t\t${message.text.replace(/\n/g, "\t\t")}\n\n`;
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
                return "*@ " + fullNamesMapped[userId] + "*"
            }).replace(/\<\!here\>/g, "*@ here*").replace(/\<\!channel\>/g, "*@ channel*"),
            unfurl_links: false,
            thread_ts: threadTs,
            username: "Garlic Thread",
            icon_emoji: ":garlic_bread:"
        })

        if (usersForDelivery && usersForDelivery.length) {
            for (let userForDelivery of usersForDelivery) {

                await app.client.chat.postMessage({
                    token: context.botToken,
                    channel: userForDelivery,
                    text: `${originalUserId === userForDelivery ?
                        "You sent yourself"
                        : `${fullNamesMapped[originalUserId]} sent you`
                        } a Garlic Thread:\n\nhttps://burris-logistics.slack.com/archives/${channelId}/p${threadTs * 1000000}`,
                    unfurl_links: true,
                    username: "Garlic Thread",
                    icon_emoji: ":garlic_bread:",
                    parse: "full"
                })

                await app.client.chat.postEphemeral({
                    token: context.botToken,
                    channel: channelId,
                    user: originalUserId,
                    text: `Fresh Garlic Thread was delivered to ${fullNamesMapped[userForDelivery]}.`,
                    unfurl_links: false,
                    thread_ts: threadTs,
                    username: "Garlic Thread",
                    icon_emoji: ":garlic_bread:"
                })
            }
        }

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

const moveToThreadMoreOptionsCallback = async ({ ack, body, client, payload, context }) => {
    await ack();

    await client.views.update({
        view_id: body.view.id,
        hash: body.view.hash,
        view: {
            type: body.view.type,
            callback_id: body.view.callback_id,
            title: { ...body.view.title, text: "Create Thread / Options" },
            private_metadata: body.view.private_metadata,
            submit: body.view.submit,
            close: body.view.close,
            blocks: [
                ...body.view.blocks.filter(block => block.block_id !== "more_options_btn"),
                ...TEMPLATES.getMoreOptionsBlockArray(
                    body
                )
            ]
        }
    })
}

const moveToThreadSelectDeleteMessagesCallback = async ({ ack, body, client, payload, context }) => {
    await ack();

    const doDeleteVal = get(
        payload,
        "selected_option.value"
    ) || "false";
    const doDelete = doDeleteVal === "true" ? true : false;

    if (doDelete) await client.views.push({
        hash: body.trigger_id,
        trigger_id: body.trigger_id,
        view: {
            type: "modal",
            notify_on_close: true,
            callback_id: "move_to_thread_confirm_delete",
            title: { type: "plain_text", text: ":warning: Confirm Delete" },
            private_metadata: body.view.private_metadata,
            submit: {
                type: "plain_text",
                text: "Confirm Selection",
                emoji: true
            },
            close: {
                type: "plain_text",
                text: "Undo Selection",
                emoji: true
            },
            "blocks": [
                {
                    "type": "section",
                    "block_id": "confirm_delete_button",
                    "text": {
                        "type": "plain_text",
                        "text": "Are you sure you want to delete the old messages?\n\nNOTE: Photos and attachments will not be moved into the new thread, and may be lost."
                    }
                }
            ]
        }
    })
}

const moveToThreadConfirmDeleteMessagesCallback = async ({ ack, body, client, payload, context }) => {
    await ack();

    const undoSelection = body.type === "view_closed";

    if (undoSelection) {
        const wasDeliverToUsersOpen = payload.private_metadata.split("<?sep>")[4] == "true";
        await client.views.update({

            view_id: body.view.previous_view_id,
            // hash: body.view.hash,
            view: {
                ...TEMPLATES.getStartMessageForm(
                    payload, context, payload.private_metadata
                ),
                private_metadata: payload.private_metadata,
                blocks: [
                    ...TEMPLATES.getStartMessageForm(payload, context, payload.private_metadata).blocks,
                    ...TEMPLATES.getMoreOptionsBlockArray({ view: { private_metadata: payload.private_metadata } }).map(block =>
                        block.block_id === "delete_messages" ?
                            {
                                type: "section",
                                block_id: "delete_messages",
                                text: {
                                    type: "plain_text",
                                    text: "Cleanup:",
                                },
                                accessory: {
                                    type: "radio_buttons",
                                    action_id: `delete_messages_value_${Date.now()}`, //Resets value to false
                                    options: [
                                        {
                                            text: {
                                                type: "plain_text",
                                                text: ":wastebasket: Delete the messages afterwards",
                                                emoji: true
                                            },
                                            value: "true"
                                        },
                                        {
                                            text: {
                                                type: "plain_text",
                                                text: ":no_entry: Do NOT delete the messages afterwards",
                                                emoji: true
                                            },
                                            value: "false"
                                        }
                                    ],
                                    initial_option: {
                                        text: {
                                            type: "plain_text",
                                            text: ":no_entry: Do NOT delete the messages afterwards",
                                            emoji: true
                                        },
                                        value: "false"
                                    }
                                }
                            }
                            :
                            block
                    ),
                    ...(wasDeliverToUsersOpen ?
                        TEMPLATES.getDeliverToUsersBlockArray({ view: { private_metadata: payload.private_metadata } }) : []
                    )
                ].filter(block => block.block_id !== "more_options_btn" && (!wasDeliverToUsersOpen || block.block_id !== "deliver_to_users_btn"))
            }
        })

    }
}

const moveToThreadDeliverToUsersCallback = async ({ ack, body, client, payload, context }) => {
    await ack();

    await client.views.update({
        view_id: body.view.id,
        hash: body.view.hash,
        view: {
            type: body.view.type,
            callback_id: body.view.callback_id,
            title: body.view.title,
            private_metadata: `${body.view.private_metadata}<?sep>${true}`,
            submit: body.view.submit,
            close: body.view.close,
            blocks: [
                ...body.view.blocks.filter(block => block.block_id !== "deliver_to_users_btn"),
                ...TEMPLATES.getDeliverToUsersBlockArray(
                    body
                )
            ]
        }
    })
}


module.exports = {
    moveToThreadMessageShortcutCallback,
    moveToThreadFormSubmissionCallback,
    moveToThreadMoreOptionsCallback,
    moveToThreadSelectDeleteMessagesCallback,
    moveToThreadConfirmDeleteMessagesCallback,
    moveToThreadDeliverToUsersCallback
}