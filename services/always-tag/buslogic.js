const { get, uniq } = require("lodash");
const { app } = require("../../index");
const { asyncForEach } = require("../../utils")
const {
    CALLBACK_WAIT_TIME,
    SPACE_TRIM_MAX_ITERATIONS,
    SPACE_TRIM_INCREMENT_DOWN_FROM_THIS_FIRST,
    BOT_NAME,
    BOT_EMOJI,
    DOUBLE_AT_BOT_NAME,
    DOUBLE_AT_BOT_EMOJI,
    FEATURE_FLAGS
} = require("./constants");

/**
 * replyToTagSyntaxWithRealTag
 * 
 * @param {Object} requestObjects 
 */
const replyToTagSyntaxWithRealTag = async ({ payload, context }) => {

    // const helpNeededWithTags = context.matches.some(m =>
    //     !m.startsWith("@@") && m.startsWith("@")
    // );

    // setTimeout(async () => {
    try {

        const { user } = await app.client.users.info({
            token: context.botToken,
            user: payload.user
        });
        if (user.is_bot) return;

        const usedCustomTagTypes = payload.text.match(/(?<![\S])\@thread(?![\S])/) || payload.text.match(/(?<![\S])\@online-in-thread(?![\S])/);

        const replaceThreadTagsWithNormalTags = (txt) => txt.replace(/(?<![\S])\@thread(?![\S])/g, "@channel").replace(/(?<![\S])\@online-in-thread(?![\S])/g, "@here")
        let payloadText = replaceThreadTagsWithNormalTags(payload.text);
        const contextMatches = context.matches.map(ma => replaceThreadTagsWithNormalTags(ma))

        let doubleAtWasAttemptedCount = 0;
        let doubleAtWasIgnoredCount = 0;

        let loadedTaggables = false;
        let members;
        let usergroups;
        let candidatesMap;
        let candidatesMapFormats;

        const loadTaggables = async () => {
            loadedTaggables = true;
            [{ members }, { usergroups }] =
                await Promise.all(["users", "usergroups"].map(api =>
                    app.client[api].list({
                        token: context.botToken,
                    })
                ));
            candidatesMap = {};
            candidatesMapFormats = [];
            members.forEach(member => {
                if (!member.is_bot && !member.deleted) {
                    const realNameSplit = (member.profile.real_name || "").split(" ");
                    const displayNameSplit = (member.profile.display_name || "").split(" ");
                    // get last name
                    let lastName = (member.profile.last_name || "").toLowerCase();
                    if (!lastName && realNameSplit.length === 2) {
                        lastName = realNameSplit[1]
                    }
                    // get first name
                    let firstName = (member.profile.first_name || "").toLowerCase();
                    if (!firstName && realNameSplit.length === 2) {
                        firstName = realNameSplit[0]
                    }
                    if (!firstName && displayNameSplit.length === 2 && displayNameSplit[1] === lastName) {
                        firstName = displayNameSplit[0];
                    }
                    firstName = (firstName || "").toLowerCase();
                    lastName = (lastName || "").toLowerCase();
                    const f = firstName.charAt(0);
                    const l = lastName.charAt(0);
                    const createFormatsList = !candidatesMapFormats.length;
                    for (let [format, key] of [
                        ["name", (member.name || "").toLowerCase()],
                        ["real_name", (member.profile.real_name || "").toLowerCase()],
                        ["display_name", (member.profile.display_name || "").toLowerCase()],
                        ["first last", `${firstName} ${lastName}`],
                        ["initials", `${f}${l}`],
                        ["firstl", `${firstName}${l}`],
                        ["flast", `${f}${lastName}`],
                        ["first_l", `${firstName}_${l}`],
                        ["f_last", `${f}_${lastName}`],
                        ["first-l", `${firstName}-${l}`],
                        ["f-last", `${f}-${lastName}`],
                        ["first", firstName],
                        ["last", lastName]
                    ]) {
                        if (createFormatsList) candidatesMapFormats.push(format);
                        candidatesMap[format] = (candidatesMap[format] || {});
                        candidatesMap[format][key] = (candidatesMap[format][key] || []);
                        candidatesMap[format][key].push([member.id, member])
                    }
                }
            })
        }

        const returnHelperTags = [];
        const returnSmartTags = [];

        const attemptTagApplication = async (rawTagPortion, tagMultipleMatchedUsersWithOneTag) => {
            if (!loadedTaggables) {
                await loadTaggables();
            }
            const taggedGroup = usergroups.find(userGroup => userGroup.handle.toLowerCase() === rawTagPortion);
            const taggedHereOrChannel = ["channel", "here"].find(hereOrChannel => hereOrChannel === rawTagPortion);
            if (taggedGroup) (
                !tagMultipleMatchedUsersWithOneTag
                    ? returnHelperTags
                    : returnSmartTags
            ).push(`<!subteam^${taggedGroup.id}|@${taggedGroup.handle}>`);
            else if (taggedHereOrChannel) {
                (!tagMultipleMatchedUsersWithOneTag
                    ? returnHelperTags
                    : [] // Smart Tags doesnt support @here and @channel (not sure it ever needs to)
                ).push(`<!${taggedHereOrChannel}>`)
            } else {
                const taggedMembers = [];
                _formatsLoop: for (let format of candidatesMapFormats) {
                    let keys = [rawTagPortion];
                    if (rawTagPortion.includes("?")) {
                        const rawTagSplit = rawTagPortion.split("?");
                        // escape all input chars, add wildcard syntax for regex
                        const regex = `^${rawTagSplit.map(section =>
                            section
                                .split("")
                                .map(char => char.match(/[a-zA-Z0-9]/) ? char : `\\${char}`)
                                .join("")
                        ).join("(.)*")
                            }$`;
                        keys = Object.keys(candidatesMap[format]).filter(aKey =>
                            aKey.match(regex)
                        );
                    }
                    let breakFormatsLoop = false;
                    _keysLoop: for (let key of keys) {
                        const matches = candidatesMap[format][key] || [];
                        if (!tagMultipleMatchedUsersWithOneTag && matches.length === 1) {
                            taggedMembers.push(matches[0][1]);
                            breakFormatsLoop = true;
                            break _keysLoop;
                        } else if (tagMultipleMatchedUsersWithOneTag && matches.length > 0) {
                            matches.forEach(m => taggedMembers.push(m[1]));
                        }
                    }
                    if (breakFormatsLoop) {
                        break _formatsLoop;
                    }
                }
                if (taggedMembers.length) {
                    // filter out the OP as well here
                    taggedMembers
                        .filter(tM => tM.id !== payload.user)
                        .forEach(tM => (
                            !tagMultipleMatchedUsersWithOneTag
                                ? returnHelperTags
                                : returnSmartTags
                        ).push(`<@${tM.id}>`));
                }
            }
            return false;
        }

        await asyncForEach(contextMatches, async (tag) => {
            const usedDoubleAts = tag.startsWith("@@");
            if (usedDoubleAts) doubleAtWasAttemptedCount++;
            const { tagMultipleMatchedUsersWithOneTag } = FEATURE_FLAGS.usedDoubleAts[usedDoubleAts] || {};
            const userGroupRegex = new RegExp(`\\<\\!subteam\\^[A-Z0-9]+\\|${tag.split("")
                .map(char => char.match(/[a-zA-Z0-9]/)
                    ? char
                    : `\\${char}`
                ).join("")}\\>`);
            const tagIsActive = payloadText.includes(`<${tag}>`) ||
                payloadText.match(userGroupRegex);
            const tagIsInvalid = tag.match(/^\@[\@]*[\?]+$/) || (tag.split(" ")[0]).match(/^\@[\@]*[\?]+$/);
            if (!tagIsActive && !tagIsInvalid) {
                const tagRaw = tag.trim()
                    .replace(/^@/, "")
                    .replace(/^@/, "")
                    .replace(/\s/g, " ")
                    .replace(/[ ]{2,}/g, " ")
                    .toLowerCase();
                const containsHowManySpaces = (get(tagRaw.match(/[ ]+/g), "length") || 0);
                const desiredIterationCount = containsHowManySpaces + 1;
                const finalIterationCount = Math.min(desiredIterationCount, SPACE_TRIM_MAX_ITERATIONS);
                const tagSplitBySpaces = tagRaw.split(" ");
                const tagSplitBySpacesWithoutIgnoredPieces = tagSplitBySpaces.slice(0, finalIterationCount);
                const splitAndCall = async (tagSplitBySpacesWithoutIgnoredPieces, i, lastOneWeDid) => {
                    const tagPortionToUseSplit = tagSplitBySpacesWithoutIgnoredPieces.slice(0, i);
                    const tagPortionToUse = tagPortionToUseSplit.join(" ");
                    if (lastOneWeDid === tagPortionToUse) return [false, tagPortionToUse];
                    const success = await attemptTagApplication(tagPortionToUse, tagMultipleMatchedUsersWithOneTag);
                    return [success, tagPortionToUse];
                }
                let done = false;
                let lastOneWeDid;
                _loop1: for (let i = SPACE_TRIM_INCREMENT_DOWN_FROM_THIS_FIRST; i > 0; i--) {
                    [done, lastOneWeDid] = await splitAndCall(tagSplitBySpacesWithoutIgnoredPieces, i, lastOneWeDid);
                    if (done) break _loop1;
                }
                if (!done) {
                    _loop2: for (let i = (SPACE_TRIM_INCREMENT_DOWN_FROM_THIS_FIRST + 1); i <= finalIterationCount; i++) {
                        [done, lastOneWeDid] = await splitAndCall(tagSplitBySpacesWithoutIgnoredPieces, i, lastOneWeDid);
                        if (done) break _loop2;
                    }
                }
            } else {
                doubleAtWasIgnoredCount++
            }
        })

        const filterThem = (helperTags) => Object.keys(helperTags.reduce((obj, tag) => {
            obj[tag] = true;
            return obj;
        }, {}));
        const finalReturnHelperTags = filterThem(returnHelperTags);
        const finalReturnSmartTags = filterThem(returnSmartTags);

        if (finalReturnHelperTags.length) {
            const isMultipleHelperTags = finalReturnHelperTags.length > 1;

            let finalFinalReturnHelperTags = finalReturnHelperTags;

            const peopleText = isMultipleHelperTags ? "these people" : "this person";
            let text;
            let firstSentence = `Looks like you tried to tag ${peopleText}.`;
            let betweenHelpAndUsers = ":";
            const createText = () => `${usedCustomTagTypes ? "" : `${firstSentence} I can help`}${betweenHelpAndUsers} ${finalFinalReturnHelperTags.join(" ")} _(To delete, type 'undo' in the thread.)_`;
            text = createText();
            const isHereOrChannel = text.match(/(\<!here\>|\<!channel\>)/);

            const originalMessageWasInThread = payload.thread_ts;
            let finalUsersToTag = [];
            let finalUsersBeforeJoiningEarlierMatchesCount = 0;
            if (isHereOrChannel && originalMessageWasInThread) {
                const { messages } = await app.client.conversations.replies({
                    token: context.botToken,
                    limit: 200,
                    ts: payload.thread_ts,
                    channel: payload.channel,
                });
                finalUsersToTag = uniq(messages.filter(m => m.subtype !== "bot_message"
                    // vvv Comment out this line temporarily for testing if needed
                    && m.user !== payload.user
                ).map(m => m.user));
                const inactiveUsers = [];
                if (!text.match(/(\<!channel\>)/)) {
                    betweenHelpAndUsers = `${usedCustomTagTypes ? "T" : " by t"}agging online/active users in this thread:`
                    firstSentence = "\`@ here\` is not supported in threads."
                    for (let uId of finalUsersToTag) {
                        const { presence } = await app.client.users.getPresence({
                            token: process.env.ADMIN_USER_TOKEN,
                            user: uId
                        });
                        if (presence !== "active") inactiveUsers.push(uId)
                    }
                } else {
                    betweenHelpAndUsers = `${usedCustomTagTypes ? "T" : " by t"}agging all users in this thread:`
                    firstSentence = "\`@ channel\` is not supported in threads."
                }
                finalFinalReturnHelperTags = finalUsersToTag.filter(uId => !inactiveUsers.includes(uId)).map(uId => `<@${uId}>`)
                finalUsersBeforeJoiningEarlierMatchesCount = finalFinalReturnHelperTags.length;
                // Keep anyone else who was meant to be tagged ALONGSIDE @here or @channel
                // but prevent duplicates
                const earlierResultsWithoutHereOrChannel = finalReturnHelperTags.filter(tg => !tg.match(/(\<!here\>|\<!channel\>)/) && !finalFinalReturnHelperTags.includes(tg));
                const hasChannel = finalReturnHelperTags.some(tg => tg.match(/(\<!channel\>)/));
                finalFinalReturnHelperTags = uniq(
                    [earlierResultsWithoutHereOrChannel.length ? [hasChannel ? "" : "active/online: "] : []].concat(finalFinalReturnHelperTags)
                        .concat(earlierResultsWithoutHereOrChannel.length ? [", explicitly tagged: "] : [])
                        .concat(earlierResultsWithoutHereOrChannel));
            }

            text = createText();

            let noTagsWillActuallyBeUsed = false;

            if (isHereOrChannel) {
                text = text.replace(/(tag these people|tag this person)/, `use th${isMultipleHelperTags ? "ese" : "is"} tag${isMultipleHelperTags ? "s" : ""}`);
                if (!originalMessageWasInThread) {
                    text = text.replace("To delete, type 'undo' in the thread.", "To delete, type 'undo' in a new thread below this message.");
                }

                const wereThereAnyExplicitTags = text.includes("explicitly tagged");

                // If we got here, it means they used @here but no one was online
                if (!wereThereAnyExplicitTags && originalMessageWasInThread && finalUsersToTag.length && !finalUsersBeforeJoiningEarlierMatchesCount) {
                    text = "Looks like you tried to use @here, however, no one in this thread is currently online."
                    noTagsWillActuallyBeUsed = true;
                }

                // If we got here, it means they used @here but there was no one besides the OP who had participated in the thread
                if (!wereThereAnyExplicitTags && originalMessageWasInThread && !finalUsersToTag.length) {
                    const hasChannel = finalReturnHelperTags.some(tg => tg.match(/(\<!channel\>)/));
                    text = `Looks like you tried to use @${hasChannel ? "channel" : "here"}, however, there is no one in this thread (besides you) to tag.`
                    noTagsWillActuallyBeUsed = true;
                }

            }

            text = text.replace(/active\/online\:  /, "active/online: (none)");

            payloadText = payloadText
                .replace(/(?<![\S])\@channel(?![\S])/g, "\`@thread\`").replace(/(?<![\S])\@here(?![\S])/g, "\`@online-in-thread\`");

            app.client.chat.postMessage({
                username: noTagsWillActuallyBeUsed ? BOT_NAME : `${user.real_name} (clone)`,
                ...(noTagsWillActuallyBeUsed ? { icon_emoji: BOT_EMOJI } : { icon_url: user.profile.image_48 }),
                token: context.botToken,
                channel: payload.channel,
                thread_ts: isHereOrChannel && !originalMessageWasInThread ? undefined : payload.thread_ts || payload.ts,
                text: text,
                ...({
                    blocks: noTagsWillActuallyBeUsed ? [
                        {
                            type: "section",
                            text: {
                                type: "plain_text",
                                text: text
                            }
                        }
                    ] : [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: payloadText
                            }
                        },
                        {
                            type: "divider"
                        },
                        {
                            type: "context",
                            elements: [{
                                type: "mrkdwn",
                                text: `:tag: *${BOT_NAME} says:* ${text}`
                            }]
                        }
                    ]
                })
            })
        }

        if (finalReturnSmartTags.length) {
            await app.client.chat.postMessage({
                username: DOUBLE_AT_BOT_NAME,
                icon_emoji: DOUBLE_AT_BOT_EMOJI,
                token: context.botToken,
                channel: payload.channel,
                thread_ts: payload.thread_ts || payload.ts,
                text: `\`@@:\` ${finalReturnSmartTags.join(" ")} _(To delete, type 'undo smart' in the thread.)_`
            })
        } else if (doubleAtWasAttemptedCount > 0 && doubleAtWasAttemptedCount > doubleAtWasIgnoredCount) {
            await app.client.chat.postMessage({
                username: DOUBLE_AT_BOT_NAME,
                icon_emoji: ":warning:",
                token: context.botToken,
                channel: payload.channel,
                thread_ts: payload.thread_ts || payload.ts,
                text: `\`@@:\` [No users matched.] _(To delete, type 'undo smart' in the thread.)_`
            })
        }

        return;
    } catch (e) {
        console.error(e)
    }
    // }, helpNeededWithTags ? CALLBACK_WAIT_TIME : 0)
}

/**
 * undoRealTagReply
 * 
 * @param {Object} requestObjects 
 */
const undoRealTagReply = (isSmart) => async ({ payload, context }) => {
    try {
        // Only works in thread!
        if (!payload.thread_ts) return;

        const { messages } = await app.client.conversations.replies({
            token: context.botToken,
            limit: 200,
            ts: payload.thread_ts,
            channel: payload.channel,
        });

        let passedUndoMessageWhileTraversingBackwards = false;
        let tsToDelete;
        for (let message of messages.reverse()) {
            if (
                (message.username === (isSmart ? DOUBLE_AT_BOT_NAME : BOT_NAME))
                || (message.username && message.username.endsWith(" (clone)"))
            ) {
                if (passedUndoMessageWhileTraversingBackwards) {
                    tsToDelete = message.ts;
                    break;
                }
            } else if (message.ts === payload.ts) {
                passedUndoMessageWhileTraversingBackwards = true;
            }
        }
        if (tsToDelete) {
            app.client.chat.delete({
                token: context.botToken,
                channel: payload.channel,
                ts: tsToDelete,
                as_user: true
            })
            return app.client.chat.delete({
                token: process.env.ADMIN_USER_TOKEN,
                channel: payload.channel,
                ts: payload.ts,
                as_user: true
            })
        }
    } catch (e) {
        console.error(e)
    }
}

module.exports = { replyToTagSyntaxWithRealTag, undoRealTagReply };
