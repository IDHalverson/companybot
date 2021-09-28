const { get } = require("lodash")
const { app } = require("../../index");
const Transformers = require("./transformers")
const CONSTANTS = require("./constants")
const { asyncForEach } = require("../../utils")
const UTILS = require("../../utils")

const blockMatchesPattern = (block, regExpression) => block.text && (typeof block.text === "string" && block.text.match(regExpression) ||
    typeof (block.text && block.text.text) === "string" && block.text.text.match(regExpression))

const ifConfiguredPassAlongMessage = async ({ message, payload, context, }) => {
    if (payload.channel === process.env.BOT_ERRORS_SLACK_CHANNEL) return;
    try {

        // ignore edits
        if (message.subtype === "message_changed") return;

        if (!process.env.EXECUTE_PASSALONG_FOR_CHANNELS.includes(`<${payload.channel}>`)) return

        const configurations = [];
        for (let i = 1; i <= CONSTANTS.MAX_PASSALONG_CONFIGS; i++) {
            const config = process.env[`PROD_PASSALONG_CONFIGURATION${i}`];
            if (!config) {
                break;
            } else {
                configurations.push(config)
            }
        }

        await asyncForEach(configurations, async configuration => {
            const [originationChannel, senderIdConfig, searchFor, sendTo, transformerName] = configuration.split("<<<<,>>>>");

            const senderId = senderIdConfig.split("{")[0];
            const senderConfigsAsTxt = new String(`{${senderIdConfig.split("{")[1]}`)
            const senderConfigs = senderIdConfig.split("{")[1] ? JSON.parse(senderConfigsAsTxt) : {};

            const matchesChannel = !originationChannel || originationChannel === payload.channel;
            if (matchesChannel) {
                const matchesUser = !senderId || (message.user === senderId);
                const matchesBot = !senderId || ((message.bot_profile && message.bot_profile.app_id === senderId) || (message.bot_id && message.bot_id === senderId));
                if (matchesUser || matchesBot) {
                    const regExpression = new RegExp(searchFor);
                    const matchFoundInText = (message.text || "").match(regExpression);
                    const matchFoundInAttachments = (message.attachments && (message.attachments[0]
                        && ((message.attachments[0].blocks && message.attachments[0].blocks.some(block => blockMatchesPattern(block, regExpression)))
                            || (message.attachments[0].title && message.attachments[0].title.match(regExpression))
                            || (message.attachments[0].fallback && message.attachments[0].fallback.match(regExpression)))
                    ));
                    const matchFoundInBlocks = message.blocks && message.blocks.some(block => blockMatchesPattern(block, regExpression));
                    if (matchFoundInText || matchFoundInAttachments || matchFoundInBlocks) {
                        const customTransform = Transformers[transformerName]
                        const { username, icon_emoji, text, blocks, attachments } = (customTransform && customTransform(message)) || {};
                        let finalContent = {
                            text: text,
                            blocks: blocks,
                            attachments: attachments
                        };
                        if (!finalContent.text && !finalContent.blocks && !finalContent.attachments) {
                            let mappedBlocks = (message.blocks ? message.blocks : (message.attachments[0] && message.attachments[0].blocks || []))
                                .filter(b => !["rich_text", "rich_text_section"].includes(b.type)).map(b => ({ ...b, block_id: undefined }));
                            if (!mappedBlocks.length) mappedBlocks = null;
                            finalContent = getFallbackContent(mappedBlocks, { message, payload })
                        }

                        let user;
                        if (!icon_emoji || !username) {
                            const userResp = await app.client.users.info({
                                token: process.env.ADMIN_USER_TOKEN,
                                user: senderConfigs.lookupId || senderId
                            });
                            user = userResp.user;
                        }

                        sendTo && app.client.chat.postMessage({
                            token: context.botToken,
                            channel: sendTo,
                            ...(icon_emoji
                                ? { icon_emoji }
                                : { icon_url: user.profile.image_48 }
                            ),
                            username: username ? username : `${senderConfigs.displayName || user.real_name} (clone)`,
                            ...finalContent
                        })
                    }
                }
            }
        })
    } catch (e) {
        console.error(e)
        const textForError = message.text || [
            get(message, "attachments[0].title")
            || get(message, "attachments[0].fallback")
            || get(message, "blocks[0].text.text")
            || get(message, "blocks[0].text")
        ].reduce((returnTxt, txt) => {
            if (txt && txt.length > returnTxt) {
                return txt;
            } else return returnTxt
        }, "");
        UTILS.sendErrorToSlack(
            app,
            textForError,
            e
        )
    }
}

const getFallbackContent = (mappedBlocks, { message, payload }) => {
    if (mappedBlocks) {
        return {
            blocks: [
                ...mappedBlocks.map(b => ({ ...b, block_id: undefined })),
                {
                    type: "divider"
                },
                {
                    type: "context",
                    elements: [{
                        type: "mrkdwn",
                        text: `${CONSTANTS.BOT_EMOJI} *${CONSTANTS.BOT_NAME} says:* This message originated in <#${payload.channel}>.`
                    }]
                }
            ]
        }
    } else if (message.attachments) {
        return {
            attachments: [
                ...message.attachments,
                {
                    title: `${CONSTANTS.BOT_EMOJI} ${CONSTANTS.BOT_NAME} says: This message originated in <#${payload.channel}>.`
                }
            ]
        }
    } else if (message.text) {
        return {
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: message.text
                    }
                },
                {
                    type: "divider"
                },
                {
                    type: "context",
                    elements: [{
                        type: "mrkdwn",
                        text: `${CONSTANTS.BOT_EMOJI} *${CONSTANTS.BOT_NAME} says:* This message originated in <#${payload.channel}>.`
                    }]
                }
            ]
        }
    }
}

module.exports = { ifConfiguredPassAlongMessage }