require("dotenv").config();
const nodemailer = require("nodemailer");
const { App } = require("@slack/bolt");
const BurrisBot = require("./burris-bot");

const burrisBot = new BurrisBot();

const transporter = nodemailer.createTransport({
  host: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
const defaultMailOptions = {
  from: "burrisbot@gmail.com",
  to: "ihalverson@burrislogistics.com",
  subject: "Support Request from Slack: "
};

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// code here

// app.event('message.channels', async ({event, context}) => {
//   try {
//     console.log(event);
//     console.log(context);
//   } catch (e) {
//     console.error(e)
//   }
// });

app.message(/(.)*burris(\-|\_)*bot(.)*/i, async ({ context, say }) => {
  await say(burrisBot.getBurrisBotGreeting());
});

app.message(
  /(.)*\@\@email(\-|\_)*solutions\ (.)*/i,
  async ({ context, say }) => {
    const supportRequest = context.matches[2];

    const mailOptions = {
      ...defaultMailOptions,
      subject: defaultMailOptions.subject + `${supportRequest}`,
      html: `<p>${supportRequest}</p>`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error(err);
    });
  }
);

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("Burris Bot is now running!");
})();
