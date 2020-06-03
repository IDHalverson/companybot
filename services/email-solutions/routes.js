const { app } = require("../../index");
const { getUserContext } = require("./middleware");
const {
  messageRawTextMatchCallback,
  slashSolutionsCommandCallback,
  emailSolutionsMessageShortcutCallback,
  emailSolutionsGlobalShortcutCallback,
  emailSolutionsFormSubmissionCallback
} = require("./buslogic");

app.message(
  /.*\@(?:email)?(?:\-|\_|\ )?solutions\ (.*)/i,
  messageRawTextMatchCallback
);

app.command("/solutions", getUserContext, slashSolutionsCommandCallback);

app.shortcut(
  "email_solutions_shortcut",
  getUserContext,
  emailSolutionsMessageShortcutCallback
);

app.shortcut(
  "email_solutions_global_shortcut",
  getUserContext,
  emailSolutionsGlobalShortcutCallback
);

app.view("solutions_email", emailSolutionsFormSubmissionCallback);
