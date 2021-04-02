const { get } = require("lodash");
const { app } = require("../../index");
const { asyncForEach } = require("../../utils")
const {
    SPACE_TRIM_MAX_ITERATIONS,
    SPACE_TRIM_INCREMENT_DOWN_FROM_THIS_FIRST
} = require("./constants");

/**
 * replaceTagSyntaxWithRealTag
 * 
 * @param {Object} requestObjects 
 */
const replaceTagSyntaxWithRealTag = async ({ payload, context }) => {

    const { user } = await app.client.users.info({
        token: context.botToken,
        user: payload.user
    });
    if (user.is_bot) return;

    let loadedTaggables = false;

    const loadTaggables = async () => {
        loadedTaggables = true;
        [{ members }, { usergroups }] =
            await Promise.all(["users", "usergroups"].map(api =>
                app.client[api].list({
                    token: context.botToken,
                })
            ));
    }

    let members;
    let usergroups;
    const returnTags = [];

    const attemptTagApplication = async (rawTagPortion, tagSplitBySpacesWithoutIgnoredPieces) => {
        if (!loadedTaggables) {
            await loadTaggables();
        }
        const taggedGroup = usergroups.find(userGroup => userGroup.handle.toLowerCase() === rawTagPortion);
        if (taggedGroup) returnTags.push(`<!subteam^${taggedGroup.id}|@${taggedGroup.handle}>`);
        else {
            const taggedMember = members.find(member =>
                (member.name || "").toLowerCase() === rawTagPortion
                || (member.real_name || "").toLowerCase() === rawTagPortion
                || (member.profile.display_name || "").toLowerCase() === rawTagPortion
            );
            if (taggedMember) returnTags.push(`<@${taggedMember.id}>`);
        }
        return false;
    }

    await asyncForEach(context.matches, async (tag) => {
        const tagIsActive = payload.text.includes(`<${tag}>`) ||
            payload.text.match(new RegExp(`\\<\\!subteam\\^[A-Z0-9]+\\|${tag}\\>`));
        if (!tagIsActive) {
            const tagRaw = tag.trim().replace(/^@/, "").replace(/\s/g, " ").replace(/[ ]{2,}/g, " ").toLowerCase();
            const containsHowManySpaces = (get(tagRaw.match(/[ ]+/g), "length") || 0);
            const desiredIterationCount = containsHowManySpaces + 1;
            const finalIterationCount = Math.min(desiredIterationCount, SPACE_TRIM_MAX_ITERATIONS);
            const tagSplitBySpaces = tagRaw.split(" ");
            const tagSplitBySpacesWithoutIgnoredPieces = tagSplitBySpaces.slice(0, finalIterationCount);
            const splitAndCall = async (tagSplitBySpacesWithoutIgnoredPieces, i, lastOneWeDid) => {
                const tagPortionToUseSplit = tagSplitBySpacesWithoutIgnoredPieces.slice(0, i);
                const tagPortionToUse = tagPortionToUseSplit.join(" ");
                if (lastOneWeDid === tagPortionToUse) return [false, tagPortionToUse];
                const success = await attemptTagApplication(tagPortionToUse, tagPortionToUseSplit);
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
        }
    })

    if (returnTags.length) {

        const peopleText = returnTags.length > 1 ? "these people" : "this person";

        await app.client.chat.postMessage({
            token: context.botToken,
            channel: payload.channel,
            thread_ts: payload.ts,
            as_user: true,
            text: `Looks like you tried to tag ${peopleText}. I can help: ${returnTags.join(" ")}`
        })
    }
    return;
}

module.exports = { replaceTagSyntaxWithRealTag };
