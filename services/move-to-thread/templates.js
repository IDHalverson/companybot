const moment = require("moment")

const getStartMessageForm = (
    payload,
    context,
) => {

    return {
        callback_id: "move_to_thread",
        type: "modal",
        title: {
            type: "plain_text",
            text: "Provide Initial Message",
            emoji: true
        },
        private_metadata: `${payload.message.ts}<?sep>${payload.channel.id}<?sep>${context.user_id}<?sep>${payload.response_url}`,
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
                    initial_value: `conversation on ${moment(payload.message.ts * 1000).format("MM/DD/YYYY")}`,
                    placeholder: { type: "plain_text", text: "Make it clever" }
                },
                label: {
                    type: "plain_text",
                    text: "Thread title:",
                    emoji: false
                }
            },
            {
                type: "input",
                block_id: "delete_messages",
                element: {
                    type: "static_select",
                    action_id: "delete_messages_value",
                    placeholder: {
                        "type": "plain_text",
                        "text": "Select yes/no"
                    },
                    options: [
                        {
                            text: {
                                type: "plain_text",
                                text: "Yes"
                            },
                            value: "true"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "No"
                            },
                            value: "false"
                        }
                    ],
                    initial_option: {
                        text: {
                            type: "plain_text",
                            text: "Yes"
                        },
                        value: "true"
                    }
                },
                label: {
                    type: "plain_text",
                    text: "Delete the old messages?:",
                    emoji: false
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
            }
        ]
    }
}

module.exports = { getStartMessageForm }