const { get } = require("lodash");
const { app } = require("../../index");
const { burrisBlue } = require("../../colors");

const burrisBotPostInChannel = async ({ payload, context }) => {
  try {
    if (
      payload &&
      payload.user &&
      // You must be configured with access to make BurrisBot post
      process.env.BOT_POSTS_USERS.split(",").includes(payload.user)
    ) {
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: get(context, "matches[1]"),
        text: payload.text
          .replace(
            /burrisbot\spost\sin\s\<\#([A-Za-z0-9]+)\|[a-z\-\_]+\>\s/,
            ""
          )
          .replace(/\n\*([\s]+)\*/g, "\n$1"),
        // keep @here, @channel, etc.
        parse: "full"
      });
    }
  } catch (e) {
    console.error(e.stack);
  }
};

const burrisBotMessageAllUsers = async ({ payload, context }) => {
  try {
    if (
      false &&
      // disabled until needed
      payload &&
      payload.user &&
      process.env.BOT_POSTS_USERS.split(",").includes(payload.user)
    ) {
      const users =
        (await app.client.users.list({
          token: context.botToken,
          limit: 5000
        })) || {};

      const userIds = (users.members || [])
        .filter((u) => !u.is_bot && u.name !== "slackbot")
        .map((u) => u.id);

      userIds.forEach(async (userId) => {
        await app.client.chat.postMessage({
          token: context.botToken,
          channel: userId,
          text: `*Good morning! On July 6th, Two-Factor Authentication will be required for all Burris Logistics workspace users.*\n*Here's what you need to do before then:*
            `,
          attachments: [
            {
              color: burrisBlue,
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text:
                      "1. Visit this link: https://burris-logistics.slack.com/account/settings/2fa_choose"
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text:
                      "2. Select how you would like to authenticate: (SMS or an Authenticator app), then follow the instructions provided."
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text:
                      "3. When you're finished, you should see this: *'Two-Factor authentication has been activated for your account.'*"
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text:
                      "4. If you are provided with backup authentication codes, keep them somewhere secure. You're good to go!"
                  }
                }
              ]
            }
          ],
          // keep @here, @channel, etc.
          parse: "full"
        });
      });

      //       Visit this link: https://burris-logistics.slack.com/account/settings/2fa_choose
      //       Select how you would like to authenticate: SMS or an Authenticator app
      //       When finished, you might be provided with backup Authentication Codes. Keep them somewhere secure.

      //       click on your name in the top left

      // click on administration and customize Burris Logistics

      // click on account & profile

      // Under settings you should see Two-Factor Authentication and it probably says "inactive"

      // click on whatever will let you enable it

      // it should show options for your second factor (backup phone number, 10 backup codes, sms)

      //   console.log(userIds);
      //   console.log(userIds.length);
      //   const includesAttachments = payload.text.match(/\&lt\;attachment\&gt\;/);

      //   const nonAttachmentRegex = /burrisbot\smessage\s\<\@([A-Za-z0-9]+)\>(.*)/;

      //   let attachmentRegexPrefix =
      //     "burrisbot\\smessage\\s\\<\\@([A-Za-z0-9]+)\\>\\s((?:.(?!\\&lt\\;attachment\\&gt\\;))+).*";
      //   const attachmentRegexAttachment =
      //     "(?:(?:.(?<=\\&lt\\;attachment\\&gt\\;))+)(.+)(?:(?=.(?=\\&lt\\;\\/attachment\\&gt\\;))+)";

      //   let wholeRegex = attachmentRegexPrefix;

      //   const maxAttachments = 3;
      //   [...new Array(maxAttachments)].forEach(() => {
      //     wholeRegex = wholeRegex + attachmentRegexAttachment;
      //   });

      //   console.log(wholeRegex);

      //   const regex = new RegExp(wholeRegex);
      //   console.log(regex);

      //   const textMatch = payload.text.match(regex);

      //   console.log(textMatch);

      //   const mainText = "a";
      //   //textMatch[2];
      //   const firstAttachment = "a";
      //   //textMatch[3];

      //   const formatText = (text) => text.replace(/\n\*([\s]+)\*/g, "\n$1");

      //   await app.client.chat.postMessage({
      //     token: context.botToken,
      //     channel: get(context, "matches[1]"),
      //     text: formatText(mainText),
      //     attachments: [
      //       {
      //         color: burrisBlue,
      //         blocks: [
      //           {
      //             type: "section",
      //             text: {
      //               type: "mrkdwn",
      //               text: formatText(firstAttachment)
      //             }
      //           }
      //         ]
      //       }
      //     ],
      //     // keep @here, @channel, etc.
      //     parse: "full"
      //   });
    }
  } catch (e) {
    console.error(e.stack);
  }
};

module.exports = { burrisBotPostInChannel, burrisBotMessageAllUsers };
