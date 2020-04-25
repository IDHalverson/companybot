require("dotenv").config();
const nodemailer = require("nodemailer");
const moment = require("moment");
const { App } = require("@slack/bolt");
const BurrisBot = require("./burris-bot");

const burrisBot = new BurrisBot();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
const defaultMailOptions = {
  from: process.env.EMAIL_USER,
  to: process.env.SOLUTIONS_EMAIL,
  subject: "[Slack] "
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
    const supportRequest = context.matches[3];
    const mailOptions = {
      ...defaultMailOptions,
      subject:
        defaultMailOptions.subject +
        `${supportRequest} (${moment(Date.now()).format(
          "MM/DD/YYYY @ hh:mma"
        )})`,
      html: `<p>${supportRequest}</p>`
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error(err);
    });
  }
);

app.command("/solutions", async ({ context, command, body, ack, say }) => {
  await ack();

  try {
    const initialSubject =
      defaultMailOptions.subject +
      `@${command.user_name}: "${command.text}" (in #${
        command.channel_name
      } @ ${moment(Date.now()).format("hh:mma \\o\\n MM/DD/YYYY")})`;
    const initialBody = command.text;

    const result = await app.client.views.open({
      token: context.botToken,
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: {
        callback_id: "view_abc",
        type: "modal",
        title: {
          type: "plain_text",
          text: "Email Burris Solutions",
          emoji: true
        },
        submit: {
          type: "plain_text",
          text: "Submit",
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
              text: ":email: *Email to support@burrislogistics.com:*"
            }
          },
          {
            type: "input",
            element: {
              type: "plain_text_input",
              initial_value: initialSubject
            },
            label: {
              type: "plain_text",
              text: "Subject:",
              emoji: false
            }
          },
          {
            type: "input",
            element: {
              type: "plain_text_input",
              multiline: true,
              initial_value: initialBody
            },
            label: {
              type: "plain_text",
              text: "Body:",
              emoji: false
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: "*Urgency:*"
              }
            ],
            accessory: {
              type: "radio_buttons",
              initial_option: {
                text: {
                  type: "plain_text",
                  text: "Anytime is fine :thumbsup:"
                },
                value: "option 1"
              },
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "Anytime is fine :thumbsup:"
                  },
                  value: "option 1"
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Need it soon... :pray:"
                  },
                  value: "option 2"
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Immediate need! :warning:"
                  },
                  value: "option 3"
                }
              ]
            }
          }
        ]
      }
    });

    console.log("RESULT:");
    console.log(result);
  } catch (e) {
    console.error(e);
    say(
      `:email: Could not prepare email to send to ${process.env.SOLUTIONS_EMAIL}.\n\nError occurred: ${e}`
    );
  }
});

app.view("view_abc", ({ ack, view }) => {
  console.log("GOT IT IT IT IT");
  ack({
    response_action: "update",
    view: {
      type: "modal",
      title: {
        type: "plain_text",
        text: "Updated view"
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text:
              "I've changed and I'll never be the same. You must believe me."
          }
        }
      ]
    }
  });
  console.log(view);

  // const body = `
  //   <div>
  //   <strong>${context.user_name}:</strong><br><br>
  //   <p>${}</p>
  //   </div>
  // `
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("Burris Bot is now running!");
})();
