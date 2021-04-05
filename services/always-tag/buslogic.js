const { get } = require("lodash");
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
const replyToTagSyntaxWithRealTag = ({ payload, context }) => {

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
            if (taggedGroup) (
                !tagMultipleMatchedUsersWithOneTag
                    ? returnHelperTags
                    : returnSmartTags
            ).push(`<!subteam^${taggedGroup.id}|@${taggedGroup.handle}>`);
            else {
                const taggedMembers = [];
                _formatsLoop: for (let format of candidatesMapFormats) {
                    let keys = [rawTagPortion];
                    if (rawTagPortion.includes("?")) {
                        const rawTagSplit = rawTagPortion.split("?");
                        // escape all input chars, add wildcard syntax for regex
                        const regex = `^${rawTagSplit.map(section =>
                            section
                                .split("")
                                .map(char => char.match(/[a-zA-Z]/) ? char : `\\${char}`)
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
                    taggedMembers.forEach(tM => (
                        !tagMultipleMatchedUsersWithOneTag
                            ? returnHelperTags
                            : returnSmartTags
                    ).push(`<@${tM.id}>`));
                }
            }
            return false;
        }

        await asyncForEach(context.matches, async (tag) => {
            const usedDoubleAts = tag.startsWith("@@");
            if (usedDoubleAts) doubleAtWasAttemptedCount++;
            const { tagMultipleMatchedUsersWithOneTag } = FEATURE_FLAGS.usedDoubleAts[usedDoubleAts] || {};
            const tagIsActive = payload.text.includes(`<${tag}>`) ||
                payload.text.match(new RegExp(`\\<\\!subteam\\^[A-Z0-9]+\\|${tag}\\>`));
            const tagIsInvalid = tag === "@@?" || tag === "@?";
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

            const peopleText = finalReturnHelperTags.length > 1 ? "these people" : "this person";

            await app.client.chat.postMessage({
                username: BOT_NAME,
                icon_emoji: BOT_EMOJI,
                token: context.botToken,
                channel: payload.channel,
                thread_ts: payload.thread_ts || payload.ts,
                text: `Looks like you tried to tag ${peopleText}. I can help: ${finalReturnHelperTags.join(" ")} _(To delete, type 'undo' in the thread.)_`
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
            if (message.username === (isSmart ? DOUBLE_AT_BOT_NAME : BOT_NAME)) {
                if (passedUndoMessageWhileTraversingBackwards) {
                    tsToDelete = message.ts;
                }
            } else if (message.ts === payload.ts) {
                passedUndoMessageWhileTraversingBackwards = true;
            }
        }
        if (tsToDelete) {
            return app.client.chat.delete({
                token: context.botToken,
                channel: payload.channel,
                ts: tsToDelete,
                as_user: true
            })
        }
    } catch (e) {
        console.error(e)
    }
}

module.exports = { replyToTagSyntaxWithRealTag, undoRealTagReply };
