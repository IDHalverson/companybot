const { get, uniq, sampleSize, shuffle } = require("lodash");
const { app } = require("../../index");
const CONSTANTS = require("./constants")

const splitCommandAndParams = (message, config = ["command"], expectedCommand = "!emoji") => {
    let split = (message || "").trim().split(/[\s]/);
    const returnMap = {};

    if (split[0] !== expectedCommand) {
        split = [expectedCommand, split[0].split(expectedCommand)[1] || "", ...split.slice(1)]
    }

    split.forEach((part, index) => {
        const partNormalized = part.trim().toLowerCase();
        if (config[index]) {
            returnMap[config[index]] = partNormalized
        } else {
            returnMap.unnamedParams = returnMap.unnamedParams || [];
            returnMap.unnamedParams.push(partNormalized)
        }
    });

    return returnMap
}

const replaceStringFromMap = (string, replacementsMap, reverse = false) => {
    let stringToUse = string;
    if (reverse) {
        stringToUse = string.split("").reverse().join("")
    }
    const originalStringLength = stringToUse.length;
    const finalString = stringToUse.replace(/./g, (char, idx) => {
        const idxToAccessMap = reverse ? originalStringLength - (idx + 1) : idx;
        const replacement = replacementsMap[idxToAccessMap] === undefined ? char : replacementsMap[idxToAccessMap];
        const finalReplacement = reverse ? replacement.split("").reverse().join("") : replacement;
        // console.log(`Replacing ${char} at index ${idx} with ${finalReplacement} from mapIndex ${idxToAccessMap}`)
        return finalReplacement;
    })
    return reverse ? finalString.split("").reverse().join("") : finalString;
}

const handleMessage = async (args) => {
    args.ack && args.ack();
    const reply = replyCreator(args)
    const { payload, context } = args;

    const {
        command,
        howMany,
        searchTerm
    } = splitCommandAndParams(payload.text, ["command", "howMany", "searchTerm"]);

    let response;
    if (!howMany) {
        response = await getEmoji(CONSTANTS.defaultHowMany, searchTerm)
    } else if (howMany === "help") {
        response = getHelp()
    } else if (!isNaN(Number(howMany))) {
        response = await getEmoji(Number(howMany), searchTerm)
    } else if (howMany === "find") {
        response = await getEmoji(CONSTANTS.maxHowMany, searchTerm, true)
    } else {
        response = getEmojiTalk(payload.text.substring(6))
    }

    if (response) reply(response)
}

const replyCreator = ({ context, payload }) => async (replyText) => {
    await app.client.chat.postMessage({
        username: "Emoji Bot",
        icon_emoji: ":emojis:",
        token: context.botToken,
        channel: payload.channel,
        thread_ts: payload.thread_ts || undefined,
        text: replyText
    })
}

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

const getEmoji = async (howMany, searchTerm, useFindFeature = false) => {

    const howManyLimited = Math.max(
        CONSTANTS.minHowMany,
        Math.min(
            CONSTANTS.maxHowMany, howMany
        )
    );

    const emojisResponse = await fetchSlackEmojis()
    let emojisList = emojisResponse && emojisResponse.length ? emojisResponse : []

    if (!emojisList.length) return "(404 - no emojis found)";

    if (searchTerm) {
        emojisList = emojisList.filter(e => e.includes(searchTerm))
    }

    if (!emojisList.length) {
        return `Nothing matched search term. Please accept this: :${emojisResponse[getRandomInt(emojisResponse.length)]}:`
    }

    let chosenEmoji;
    if (emojisList.length > howManyLimited) {
        chosenEmoji = sampleSize(emojisList, howManyLimited)
    } else {
        chosenEmoji = shuffle(emojisList)
        let additional = 0;
        if (!useFindFeature) {
            additional = howManyLimited - emojisList.length;
        }
        let arrayToGetAdditionals = [...emojisList];
        let additionalsLength = arrayToGetAdditionals.length;
        while (additional > additionalsLength) {
            arrayToGetAdditionals = [...arrayToGetAdditionals, ...emojisList];
            additionalsLength = arrayToGetAdditionals.length;
        }
        chosenEmoji = chosenEmoji.concat(sampleSize(arrayToGetAdditionals, additional))
    }

    const final = `${chosenEmoji.map(e => `:${e}:`).join("")}`;

    return final ? final : "Something went wrong."
}

const getEmojiTalk = (rawText) => {

    let text = rawText.trim();

    // insert placeholders for emojis and tags
    const existingEmojiOrPlaceholders = Array.from((text.match(/(:[a-zA-Z0-9_-]+:|%%)/g) || []));
    text = text.replace(/:[a-zA-Z0-9_-]+:/g, "%%");
    const atsOrPlaceholders = Array.from(text.match(/(?:<(?:@|#|!subteam\^)[A-Z0-9]{8,12}(?:\|[@a-z_-]+)?>|@@)/g) || []);
    text = text.replace(/<(?:@|#|!subteam\^)[A-Z0-9]{8,12}(?:\|[@a-z_-]+)?>/g, "@@")

    // Replace letters and numbers with emojis until max reached
    let emojiCount = existingEmojiOrPlaceholders.filter(it => it !== "%%").length;
    const replacementMap = {};
    for (let charIndex in text) {
        const char = text[charIndex]
        if (emojiCount < CONSTANTS.maxEmojiTalkEmojis) {
            const newChar = charToEmoji(char);
            replacementMap[charIndex] = newChar;
            if (newChar.startsWith(":")) emojiCount++
        }
    }
    let response = replaceStringFromMap(text, replacementMap)

    // Re-insert emojis and tags
    const lists = [
        [existingEmojiOrPlaceholders, /%%/g],
        [atsOrPlaceholders, /@@/g]
    ];
    const replMap = {};
    lists.forEach(([list, regex]) => {
        let myArray;
        while ((myArray = regex.exec(response)) !== null) {
            const index1 = regex.lastIndex - 2;
            const index2 = regex.lastIndex - 1;
            replMap[index1] = list.shift();
            replMap[index2] = "";
        }
    })
    response = replaceStringFromMap(response, replMap, true)

    return response
}

const charToEmoji = (char) => {
    if (char.match(/[a-zA-Z]/)) {
        return CONSTANTS.charToEmojiMap[char] || `:${char}2:`
    } else {
        return CONSTANTS.charToEmojiMap[char] || char;
    }
}

const fetchSlackEmojis = async () => {
    const emojiResp = await app.client.emoji.list({
        token: process.env.ADMIN_USER_TOKEN
    })
    const emojisList = Object.keys(emojiResp.emoji)
    return emojisList
}

const getHelp = () => {
    return (`Gets random or searched emoji. Limit 20. Usages:
• \`!emoji [optional int]\` gets emoji, default 5
• \`!emoji <int> <search_term>\` gets specified number of emoji that match search term
• \`!emoji find <search_term>\` gets 20 emoji that match the search term
• \`!emoji <some_text>\` returns "emoji talk", i.e. your text but in emoji.`)
}

module.exports = { handleMessage }