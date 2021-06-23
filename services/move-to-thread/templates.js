const moment = require("moment")

const getStartMessageForm = (
    payload,
    context,
    private_metadata = ""
) => {

    return {
        callback_id: "move_to_thread",
        type: "modal",
        title: {
            type: "plain_text",
            text: "Provide Initial Message",
            emoji: true
        },
        private_metadata: private_metadata || `${payload.message.ts}<?sep>${payload.channel.id}<?sep>${context.user_id}<?sep>${payload.response_url}`,
        submit: {
            type: "plain_text",
            text: "Create Thread",
            emoji: true
        },
        close: {
            type: "plain_text",
            text: "Cancel",
            emoji: true
        },
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Where does the conversation for this thread start\?* :link:`
                }
            },
            {
                type: "input",
                block_id: "start_msg_lnk",
                element: {
                    type: "plain_text_input",
                    action_id: "start_msg_lnk_value",
                    initial_value: "",
                    placeholder: { type: "plain_text", text: "Paste the link" }
                },
                label: {
                    type: "plain_text",
                    text: "Copy the link and provide it here:",
                    emoji: false
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `:bulb: Tip: Find the message, right click the timestamp, then "copy link".`
                    }
                ]
            },
            {
                type: "section",
                block_id: "more_options_btn",
                text: {
                    type: "plain_text",
                    text: " "
                },
                accessory: {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: ":more_options: More Options...",
                        emoji: true
                    },
                    action_id: "move_to_thread_more_options"
                }
            }
        ]
    }
}

const getMoreOptionsBlockArray = (body) => {
    return [
        {
            type: "input",
            block_id: "conversation_category",
            element: {
                type: "static_select",
                action_id: "conversation_category_value",
                placeholder: {
                    "type": "plain_text",
                    "text": "Select a category"
                },
                options: [
                    {
                        text: {
                            type: "plain_text",
                            text: "Discussion"
                        },
                        value: "Discussion"
                    },
                    {
                        text: {
                            type: "plain_text",
                            text: "Issue"
                        },
                        value: "Issue"
                    },
                    {
                        text: {
                            type: "plain_text",
                            text: "Prod Disruption"
                        },
                        value: "Prod Disruption"
                    },
                    {
                        text: {
                            type: "plain_text",
                            text: "Meeting"
                        },
                        value: "Meeting"
                    },
                    {
                        text: {
                            type: "plain_text",
                            text: "Conversation"
                        },
                        value: "Conversation"
                    },
                    {
                        text: {
                            type: "plain_text",
                            text: "Channel Declutter"
                        },
                        value: "Channel Declutter"
                    },
                    {
                        text: {
                            type: "plain_text",
                            text: "Watercooler Chat"
                        },
                        value: "Watercooler Chat"
                    }
                ],
                initial_option: {
                    text: {
                        type: "plain_text",
                        text: "Discussion"
                    },
                    value: "Discussion"
                }
            },
            label: {
                type: "plain_text",
                text: "Conversation category:",
                emoji: false
            }
        },
        {
            type: "input",
            block_id: "thread_title",
            element: {
                type: "plain_text_input",
                action_id: "thread_title_value",
                initial_value: `had on ${moment(Number(body.view.private_metadata.split("<?sep>")[0]) * 1000).format("MM/DD/YYYY")}`,
                placeholder: { type: "plain_text", text: "Make it clever" }
            },
            label: {
                type: "plain_text",
                text: "Thread title:",
                emoji: false
            }
        },
        {
            type: "section",
            block_id: "delete_messages",
            text: {
                type: "plain_text",
                text: "Cleanup:",
            },
            accessory: {
                type: "radio_buttons",
                action_id: "delete_messages_value",
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
        },
        {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `:pencil: Note: Messages with a thread of their own will _not_ be deleted.`
                }
            ]
        },
        {
            type: "section",
            block_id: "deliver_to_users_btn",
            text: {
                type: "plain_text",
                text: " "
            },
            accessory: {
                type: "button",
                text: {
                    type: "plain_text",
                    text: ":mailbox_with_mail: Send This Thread To Users",
                    emoji: true
                },
                action_id: "move_to_thread_deliver_to_users"
            }
        }
    ]
}

const getDeliverToUsersBlockArray = (body) => {
    return [
        {
            type: "input",
            block_id: "deliver_to_users",
            element: {
                type: "multi_users_select",
                action_id: "deliver_to_users_value",
                placeholder: {
                    "type": "plain_text",
                    "text": "Select users to receive thread"
                },
                initial_users: [body.view.private_metadata.split("<?sep>")[2]]
            },
            label: {
                type: "plain_text",
                text: "Deliver hot fresh :garlic_bread: garlic thread to:",
                emoji: true
            }
        }
    ]
}

module.exports = { getStartMessageForm, getMoreOptionsBlockArray, getDeliverToUsersBlockArray }