const { get, uniq, sampleSize, shuffle } = require("lodash");
const { app } = require("../../index");
const CONSTANTS = require("./constants")

const splitCommandAndParams = (message, config = ["command"]) => {
    const split = (message || "").trim().split(/[\s]/);
    const returnMap = {};
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
        response = "emoji talk coming soon"
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

    let emojisList = await fetchSlackEmojis()
    if (!emojisList) emojisList = [];

    if (!emojisList.length) return "(404 - no emojis found)";

    if (searchTerm) {
        emojisList = emojisList.filter(e => e.includes(searchTerm))
    }

    if (!emojisList.length) {
        return `Nothing matched search term. Please accept this: ${emojisList[getRandomInt(emojisList.length)]}`
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


// -------------------

// def _char_to_emoji(self, char):
// if re.match(r'[a-zA-Z]', char):
//     return f':{char}:'
// elif re.match(r'[0-9\s"!?]', char):
// return self.number_to_emoji_map[char]
//         else:
// return char

// -------------------

// def _get_emoji_talk(self, text):
// existing_emoji = re.findall(r':[a-zA-Z0-9_-]+:', text)
// text = re.sub(r':[a-zA-Z0-9_-]+:', '%%', text)
// ats = re.findall(r'<@[A-Z0-9]{8,10}>', text)
// text = re.sub(r'<@[A-Z0-9]{8,10}>', '@@', text)
// emoji_count = len(existing_emoji)
// response = ''

// for char in text:
//     if emoji_count < self.max_emoji_talk_emojis:
//         char = self._char_to_emoji(char)

// response += char

// if char.startswith(':'):
//     emoji_count += 1

// while existing_emoji:
//     i = response.find('%%')

// if i < 0:
//     break

// response = response[: i]+ existing_emoji.pop(0) + response[i + 2:]

// while ats:
//     i = response.find('@@')

// if i < 0:
//     break

// response = response[: i]+ ats.pop(0) + response[i + 2:]

// return response
