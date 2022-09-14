const { app } = require("../../index");
const CompanyBot = require("./company-bot");
const {
  companyBotPostInChannel,
  companyBotMessageAllUsers,
  addEmoji,
} = require("./buslogic");

const companyBot = new CompanyBot();

app.message(
  // Adding 0-9 to the channel name causes entire message to get posted instead
  // of specified text... TODO: fix
  new RegExp(`${companyBot.companyNameLowerCaseNoSpaces
    }bot\\spost\\sin\\s\\<\\#([A-Za-z0-9]+)\\|[a-z\\-\\_]+\\>\\s(.+)`),
  companyBotPostInChannel
);

// app.message(
//   /companybot\smessage\s\<\@([A-Za-z0-9]+)\>\s(.+)/,
//   companyBotMessageUser
// );

app.message(
  new RegExp(`${companyBot.companyNameLowerCaseNoSpaces
    }bot\\smessage\\severyone\\s?(.*)`),
  companyBotMessageAllUsers
);

app.message(
  new RegExp(`(.)*${companyBot.companyNameLowerCaseNoSpaces
    }(\\-|\\_|\\s)*bot(?!\\:)(.)*`, "i"),
  async ({ say }) => {
    await say(companyBot.getCompanyBotGreeting());
  });

app.command("/say-good-morning", async ({ ack, say }) => {
  await ack();
  say(companyBot.getGoodMorningGreeting());
});

app.message(/moin/i, addEmoji('stop2'));

// app.message(
//   /your face is/i,
//   async ({ say }) => {
//     await say("Your face is a monstrous regiment of women");
//   }
// );

app.message(
  /knox/i,
  addEmoji('wave')
)