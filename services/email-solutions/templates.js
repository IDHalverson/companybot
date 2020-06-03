const getEmailSolutionsForm = (
  command,
  context,
  initialSubject,
  initialBody
) => {
  return {
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
  };
};

const getEphemeralEmailSolutionsTip = (text) =>
  `:point_up: Tip: Try typing \`/solutions ${text}\` to send an email to ${process.env.SOLUTIONS_EMAIL}.`;

const getEphemeralCouldNotPrepareEmailText = (error) =>
  `:email: Could not prepare email to send to ${process.env.SOLUTIONS_EMAIL}.\n\nError occurred: ${error}`;

const getProblemSendingEmailResponse = (error) => {
  return {
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
            text: `There was a problem sending your email to ${process.env.SOLUTIONS_EMAIL}. :email:\n\nError:\n${error}`
          }
        }
      ]
    }
  };
};

const getEmailSuccessEphemeralResponse = (context, channel_id, user_id) => {
  return {
    token: context.botToken,
    channel: channel_id,
    user: user_id,
    text: `:email: :heavy_check_mark: I sent that email to ${process.env.SOLUTIONS_EMAIL} for you.`
  };
};

const getEmailSuccessAckResponseModalUpdate = () => {
  return {
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
  };
};

const getEmailTextAndHtmlContent = (
  channel_name,
  user_email,
  user_real_name,
  urgency,
  body,
  subject
) => {
  let newSubject = subject;
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
    newSubject = "[URGENT] " + newSubject;
  }
  return {
    bodyHtml,
    bodyText,
    subject: newSubject
  };
};

module.exports = {
  getEmailSolutionsForm,
  getEphemeralEmailSolutionsTip,
  getEphemeralCouldNotPrepareEmailText,
  getProblemSendingEmailResponse,
  getEmailSuccessEphemeralResponse,
  getEmailSuccessAckResponseModalUpdate,
  getEmailTextAndHtmlContent
};
