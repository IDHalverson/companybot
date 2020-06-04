const moment = require("moment");
const { get } = require("lodash");

const jiraUnfurlAttachments = (jiraJson, jiraBrowseUrl, jiraIdentifier) => [
  {
    color: "2684ff",
    text: `<${jiraBrowseUrl}|*${jiraIdentifier}: ${get(
      jiraJson,
      "fields.summary",
      "?"
    )}*>\nStatus: \`${get(
      jiraJson,
      "fields.status.name",
      "none"
    )}\`       Assignee: ${
      !get(jiraJson, "fields.assignee.displayName")
        ? "*Unassigned*"
        : `<${process.env.JIRA_USER_PROFILE_PREFIX}${get(
            jiraJson,
            "fields.assignee.name",
            "none"
          )}|*${get(jiraJson, "fields.assignee.displayName", "none")}*>`
    }       Priority: *${get(jiraJson, "fields.priority.name", "none")}*`,
    footer: `<${process.env.JIRA_PROJECT_PREFIX}${get(
      jiraJson,
      "fields.project.key"
    )}|${get(jiraJson, "fields.project.name")}> | <${
      process.env.JIRA_MAIN_URL
    }|${process.env.JIRA_OUTER_CONTEXT_TEXT}>`,
    footer_icon:
      "https://emoji.slack-edge.com/T01094KTUES/jira_alien_spaceship/dcaf93460f86f468.png"
  }
];

const jiraDetailedAttachments = (jiraJson, jiraBrowseUrl, jiraIdentifier) => [
  {
    color: "2684ff",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${jiraBrowseUrl}|*${jiraIdentifier}: ${get(
            jiraJson,
            "fields.summary",
            "?"
          )}*>`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Assignee*: ${
              !get(jiraJson, "fields.assignee.displayName")
                ? "*Unassigned*"
                : `<${process.env.JIRA_USER_PROFILE_PREFIX}${get(
                    jiraJson,
                    "fields.assignee.name",
                    "none"
                  )}|*${get(jiraJson, "fields.assignee.displayName", "none")}*>`
            }`
          },
          {
            type: "mrkdwn",
            text: `*Reporter*: ${
              !get(jiraJson, "fields.reporter.displayName")
                ? "*Unassigned*"
                : `<${process.env.JIRA_USER_PROFILE_PREFIX}${get(
                    jiraJson,
                    "fields.reporter.name",
                    "none"
                  )}|*${get(jiraJson, "fields.reporter.displayName", "none")}*>`
            }`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Status*: ${get(jiraJson, "fields.status.name", "none")}`
          },
          {
            type: "mrkdwn",
            text: `*Priority*: ${get(jiraJson, "fields.priority.name", "none")}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*Description:* ${`${get(
              jiraJson,
              "fields.description",
              ""
            )}`.substring(
              0,
              // Seems to throw 500 errors when over ~3000 chars?
              2970
            )}${
              `${get(jiraJson, "fields.description", "")}`.length > 2970
                ? " (...continued)"
                : ""
            }` || "..."
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Creator*: ${
              !get(jiraJson, "fields.creator.displayName")
                ? "*Unassigned*"
                : `<${process.env.JIRA_USER_PROFILE_PREFIX}${get(
                    jiraJson,
                    "fields.creator.name",
                    "none"
                  )}|*${get(jiraJson, "fields.creator.displayName", "none")}*>`
            }`
          },
          {
            type: "mrkdwn",
            text: `*Created*: ${
              (get(jiraJson, "fields.created") &&
                moment(get(jiraJson, "fields.created")).format("MM/DD/YYYY")) ||
              "?"
            }`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Attachments*: ${
              get(jiraJson, "fields.attachment", []).length
            }`
          },
          {
            type: "mrkdwn",
            text: `*Last Updated*: ${
              (get(jiraJson, "fields.updated") &&
                moment(get(jiraJson, "fields.updated")).format("MM/DD/YYYY")) ||
              "?"
            }`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Worklogs*: ${Object.entries(
            get(jiraJson, "fields.worklog.worklogs", []).reduce((obj, wl) => {
              obj[wl.author.displayName] =
                (obj[wl.author.displayName] || 0) + wl.timeSpentSeconds;
              obj["Total"] = (obj["Total"] || 0) + wl.timeSpentSeconds;
              return obj;
            }, {})
          )
            .sort((a, b) => (a[0] === "Total" ? -1 : b[0] === "Total" ? 1 : 0))
            .map(
              ([user, seconds]) =>
                `\`${user}: ${moment
                  .duration(seconds, "seconds")
                  .asHours()}hrs\``
            )
            .join("  ")}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Labels*: ${get(jiraJson, "fields.labels", [])
            .map((l) => `\`${l}\``)
            .join("  ")}`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "image",
            image_url:
              "https://emoji.slack-edge.com/T01094KTUES/jira_alien_spaceship/dcaf93460f86f468.png",
            alt_text: "jira spaceship"
          },
          {
            type: "mrkdwn",
            text: `<${process.env.JIRA_PROJECT_PREFIX}${get(
              jiraJson,
              "fields.project.key"
            )}|${get(jiraJson, "fields.project.name")}> | <${
              process.env.JIRA_MAIN_URL
            }|${process.env.JIRA_OUTER_CONTEXT_TEXT}>`
          }
        ]
      }
    ]
  }
];

module.exports = {
  jiraUnfurlAttachments,
  jiraDetailedAttachments
};
