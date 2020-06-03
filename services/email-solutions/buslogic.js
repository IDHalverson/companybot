const { app } = require("../../index");
const TEMPLATES = require("./templates");
const axios = require("axios");
const nodemailer = require("nodemailer");
const { get } = require("lodash");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Boolean(process.env.EMAIL_SECURE), // use SSL
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

/* ASYNC METHODS */

const messageRawTextMatchCallback = async ({ context, body, payload }) => {
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
    text: TEMPLATES.getEphemeralEmailSolutionsTip(text)
  });
};

const slashSolutionsCommandCallback = async ({
  context,
  command,
  ack,
  body,
  payload
}) => {
  await ack();
  await mailSolutionsWorkflow({ context, command, body, payload });
};

const emailSolutionsMessageShortcutCallback = async ({
  context,
  body,
  ack,
  say,
  payload
}) => {
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
};

const emailSolutionsGlobalShortcutCallback = async ({
  context,
  body,
  ack,
  say,
  payload
}) => {
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
};

const emailSolutionsFormSubmissionCallback = async ({
  ack,
  payload,
  context
}) => {
  try {
    const [
      user_real_name = "",
      channel_name = "",
      user_email = "",
      user_id = "",
      channel_id = ""
    ] = payload.private_metadata.split("<sep?>");

    let enteredSubject = get(
      payload,
      "state.values.subject.subject_value.value"
    );
    const body = get(payload, "state.values.body.body_value.value");
    const urgency = get(
      payload,
      "state.values.urgency.urgency_value.selected_option.value"
    );

    const {
      bodyHtml,
      bodyText,
      subject
    } = TEMPLATES.getEmailTextAndHtmlContent(
      channel_name,
      user_email,
      user_real_name,
      urgency,
      body,
      enteredSubject
    );

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

    await ack(TEMPLATES.getEmailSuccessAckResponseModalUpdate());
    if (channel_id) {
      await app.client.chat.postEphemeral(
        TEMPLATES.getEmailSuccessEphemeralResponse(context, channel_id, user_id)
      );
    }
  } catch (e) {
    console.error(e);
    await ack(TEMPLATES.getProblemSendingEmailResponse(e));
  }
};

module.exports = {
  messageRawTextMatchCallback,
  slashSolutionsCommandCallback,
  emailSolutionsMessageShortcutCallback,
  emailSolutionsGlobalShortcutCallback,
  emailSolutionsFormSubmissionCallback
};

/* UTILS */

const mailSolutionsWorkflow = async ({ context, command, body, payload }) => {
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

    await app.client.views.open({
      token: context.botToken,
      trigger_id: body.trigger_id,
      view: TEMPLATES.getEmailSolutionsForm(
        command,
        context,
        initialSubject,
        initialBody
      )
    });
  } catch (e) {
    console.error(e);
    axios.post((body || {}).response_url || (payload || {}).response_url, {
      response_type: "ephemeral",
      replace_original: false,
      text: TEMPLATES.getEphemeralCouldNotPrepareEmailText(e)
    });
  }
};
