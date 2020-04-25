require("dotenv").config();
const nodemailer = require("nodemailer");
const moment = require("moment");
const { App } = require("@slack/bolt");
const { get } = require("lodash");
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

const getUserContext = async ({
  payload,
  context,
  command,
  next,
  ack,
  say
}) => {
  try {
    const user = await app.client.users.info({
      token: context.botToken,
      user: command.user_id,
      include_locale: true
    });
    context.user_id = user.user.id;
    context.user_email = user.user.profile.email;
    context.user_real_name = user.user.profile.real_name;
    await next();
  } catch (e) {
    ack();
    console.error(e);
    say(
      `:email: Could not prepare email to send to ${process.env.SOLUTIONS_EMAIL}.\n\nError occurred: ${e}`
    );
  }
};

app.command(
  "/solutions",
  getUserContext,
  async ({ context, command, body, ack, say }) => {
    await ack();
    try {
      const textInline = command.text
        .replace(/\n/g, " ")
        .replace(/[\s]{2,}/g, " ");
      const initialSubject =
        defaultMailOptions.subject +
        `${(textInline || "").substring(0, 60)}${
          (textInline || "").length > 59 ? "..." : ""
        }`;
      const initialBody = command.text;

      const result = await app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: {
          callback_id: "solutions_email",
          type: "modal",
          title: {
            type: "plain_text",
            text: "Email Burris Solutions",
            emoji: true
          },
          private_metadata: `${context.user_real_name}<sep?>${command.channel_name}<sep?>${context.user_email}<sep?>${context.user_id}<sep?>${command.channel_id}`,
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
                text: `:email: *Email to ${process.env.SOLUTIONS_EMAIL}:*`
              }
            },
            {
              type: "input",
              block_id: "subject",
              element: {
                type: "plain_text_input",
                action_id: "subject_value",
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
              block_id: "body",
              element: {
                type: "plain_text_input",
                action_id: "body_value",
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
              type: "input",
              block_id: "urgency",
              element: {
                type: "radio_buttons",
                action_id: "urgency_value",
                initial_option: {
                  text: {
                    type: "plain_text",
                    text: "Anytime is fine :thumbsup:"
                  },
                  value: "Anytime is fine"
                },
                options: [
                  {
                    text: {
                      type: "plain_text",
                      text: "Anytime is fine :thumbsup:"
                    },
                    value: "Anytime is fine"
                  },
                  {
                    text: {
                      type: "plain_text",
                      text: "Need it soon... :pray:"
                    },
                    value: "Need it soon"
                  },
                  {
                    text: {
                      type: "plain_text",
                      text: "Immediate need! :warning:"
                    },
                    value: "Immediate need"
                  }
                ]
              },
              label: {
                type: "plain_text",
                text: "Urgency:",
                emoji: false
              }
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `From: ${context.user_real_name} in #${command.channel_name}`
                }
              ]
            }
          ]
        }
      });
    } catch (e) {
      console.error(e);
      say(
        `:email: Could not prepare email to send to ${process.env.SOLUTIONS_EMAIL}.\n\nError occurred: ${e}`
      );
    }
  }
);

app.view("solutions_email", async ({ ack, payload, context }) => {
  try {
    const [
      user_real_name = "",
      channel_name = "",
      user_email = "",
      user_id = "",
      channel_id = ""
    ] = payload.private_metadata.split("<sep?>");

    let subject = get(payload, "state.values.subject.subject_value.value");
    const body = get(payload, "state.values.body.body_value.value");
    const urgency = get(
      payload,
      "state.values.urgency.urgency_value.selected_option.value"
    );

    const tagLine = `(Sent from Slack channel #${channel_name}. Reply to <a href="mailto:${user_email}">${user_real_name}</a>. If you experience issues with Burris Bot, contact <a href="mailto:ihalverson@burrislogistics.com">Ian Halverson</a>)`;
    const bodyHtml = `
      <div>
      <strong>Urgency level: ${urgency}</strong><br>
      <strong>Reporting user: ${user_real_name}</strong><br>
      <p>${body.replace(/\n/g, "<br>")}</p><br>
      ${tagLine}
      </div>
    `;
    const bodyText = `Urgency level: ${urgency},\nReporting user: ${user_real_name},\nMessage:${body},\n${tagLine}`;

    if (urgency === "Immediate need") {
      subject = "[URGENT] " + subject;
    }

    const mailOptions = {
      ...defaultMailOptions,
      replyTo: user_email,
      subject: subject,
      text: bodyText,
      html: bodyHtml
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) throw err; //will be caught at top level
    });

    await ack({
      response_action: "update",
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "Success"
        },
        close: {
          type: "plain_text",
          text: "Okay!",
          emoji: true
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "plain_text",
              text: `Your email has been sent to ${process.env.SOLUTIONS_EMAIL}. :email:`
            }
          }
        ]
      }
    });
    await app.client.chat.postEphemeral({
      token: context.botToken,
      channel: channel_id,
      user: user_id,
      text: `:email: :heavy_check_mark: I sent that email to ${process.env.SOLUTIONS_EMAIL} for you, <@${user_id}>`
    });
  } catch (e) {
    console.error(e);
    await ack({
      response_action: "update",
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "I couldn't Make It Happen :("
        },
        close: {
          type: "plain_text",
          text: "Close",
          emoji: true
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "plain_text",
              text: `There was a problem sending your email to ${process.env.SOLUTIONS_EMAIL}. :email:\n\nError:\n${e}`
            }
          }
        ]
      }
    });
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("Burris Bot is now running!");
})();
