require("dotenv").config();
const nodemailer = require("nodemailer");
const moment = require("moment");
const { App } = require("@slack/bolt");
const { get } = require("lodash");
const axios = require("axios");
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
  from: `"${process.env.EMAIL_DISPLAY_NAME}" ${process.env.EMAIL_USER}`,
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
  /.*\@(?:email)?(?:\-|\_|\ )?solutions\ (.*)/i,
  async ({ context, body, ack, say, payload }) => {
    const channelInfo = await app.client.channels.info({
      token: context.botToken,
      channel: body.event.channel
    });
    const channel_id = channelInfo.channel.id;
    const user_id = payload.user;
    const text = context.matches[1];
    await app.client.chat.postEphemeral({
      token: context.botToken,
      channel: channel_id,
      user: user_id,
      text: `:point_up: Tip: Try typing \`/solutions ${text}\` to send an email to ${process.env.SOLUTIONS_EMAIL}.`
    });
  }
);

app.message(
  /^(?![\s\S])/,
  async ({ context, payload }) => {
    const jiraNotifyMappings = process.env.JIRA_NOTIFY_MAPPINGS || "";
    if (payload && payload.attachments) {
      for (let mapping of (jiraNotifyMappings.split(","))) {
        const [
          jiraUsername, 
          slackMemberId, 
          deliveryMethod = "message_thread"
        ] = mapping.split(":");
        if (payload.attachments.some(att => att.text && att.text.includes(`[~${jiraUsername}]`))) {
          try {
            const jiraRegexp = new RegExp(`\\[\\~${jiraUsername}\\]`, 'g')

            const params = {
              token: context.botToken,
              channel: payload.channel,
              text: '',
              icon_emoji: ':jira:',
              username: "JIRA",
              thread_ts: payload.ts,
              attachments: payload.attachments.map(att => 
                ({
                  ...att, 
                  text: !att.text 
                    ? att.text 
                    : att.text.replace(jiraRegexp, `<@${slackMemberId}>`)
                })
              )
            }

            if (deliveryMethod === "message_thread") {
              // do nothing
            } else if (deliveryMethod === "post_message") {
              delete params.thread_ts;
            } else if (deliveryMethod === "direct_message") {
              params.channel = payload.user;
            }

            await app.client.chat.postMessage(params);

          } catch (e) {
            console.error(e)
          }
        }
      }
    }
  }
)

const getUserContext = async ({
  context,
  command = {},
  next,
  ack,
  say,
  payload = {}
}) => {
  try {
    const user = await app.client.users.info({
      token: context.botToken,
      user: get(payload, "user.id") || command.user_id,
      include_locale: true
    });
    context.user_id = user.user.id;
    context.user_email = user.user.profile.email;
    context.user_real_name = user.user.profile.real_name;
    await next();
  } catch (e) {
    ack();
    console.error(e);
    axios.post(payload.response_url, {
      response_type: "ephemeral",
      replace_original: false,
      text: `:email: Could not prepare email to send to ${process.env.SOLUTIONS_EMAIL}.\n\nError occurred: ${e}`
    });
  }
};

const mailSolutionsWorkflow = async ({
  context,
  command,
  body,
  ack,
  say,
  payload
}) => {
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
                text: `From: ${context.user_real_name}${
                  command.channel_name ? ` in #${command.channel_name}` : ""
                }`
              }
            ]
          }
        ]
      }
    });
  } catch (e) {
    console.error(e);
    axios.post((body || {}).response_url || (payload || {}).response_url, {
      response_type: "ephemeral",
      replace_original: false,
      text: `:email: Could not prepare email to send to ${process.env.SOLUTIONS_EMAIL}.\n\nError occurred: ${e}`
    });
  }
};

app.command(
  "/solutions",
  getUserContext,
  async ({ context, command, body, ack, say, payload }) => {
    await ack();
    await mailSolutionsWorkflow({ context, command, body, ack, say, payload });
  }
);

app.command(
  "/say-good-morning",
  async ({ ack, say, command }) => {
    await ack();
    say("Good morning everyone! :burris_snowflake_png:")
  }
)

app.shortcut(
  "email_solutions_shortcut",
  getUserContext,
  async ({ context, command, body, ack, say, payload }) => {
    await ack();
    const synthesizedCommand = {
      text: payload.message.text,
      channel_name: payload.channel.name,
      channel_id: payload.channel.id
    };
    await mailSolutionsWorkflow({
      context,
      command: synthesizedCommand,
      body,
      ack,
      say,
      payload
    });
  }
);

app.shortcut(
  "email_solutions_global_shortcut",
  getUserContext,
  async ({ context, command, body, ack, say, payload }) => {
    await ack();
    const synthesizedCommand = {
      text: "",
      channel_name: "",
      channel_id: ""
    };
    await mailSolutionsWorkflow({
      context,
      command: synthesizedCommand,
      body,
      ack,
      say,
      payload
    });
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

    const tagLine = `(Sent from Slack ${
      channel_name ? `channel #${channel_name}` : "global shortcut"
    }. Reply to <a href="mailto:${user_email}">${user_real_name}</a>. If you experience issues with Burris Bot, contact <a href="mailto:ihalverson@burrislogistics.com">Ian Halverson</a>)`;
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
    if (channel_id) {
      await app.client.chat.postEphemeral({
        token: context.botToken,
        channel: channel_id,
        user: user_id,
        text: `:email: :heavy_check_mark: I sent that email to ${process.env.SOLUTIONS_EMAIL} for you.`
      });
    }
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
