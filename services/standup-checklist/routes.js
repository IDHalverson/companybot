const { app } = require("../../index");
const {
  bscpStandupSlashCommandCallback,
  someoneHasGoneCallback
} = require("./buslogic");

app.command("/bscp-standup", bscpStandupSlashCommandCallback);

app.message(/check off \<\@([A-Za-z0-9]+)\>/, someoneHasGoneCallback);

app.message(/uncheck \<\@([A-Za-z0-9]+)\>/, someoneHasGoneCallback);

app.message(/where is \<\@([A-Za-z0-9]+)\>/, someoneHasGoneCallback);

app.message(/\<\@([A-Za-z0-9]+)\> is on vacation/, someoneHasGoneCallback);

app.message(
  /\<\@([A-Za-z0-9]+)\> is taking a sick day/,
  someoneHasGoneCallback
);

app.message(/\<\@([A-Za-z0-9]+)\> is busy/, someoneHasGoneCallback);

app.message(/self[\- ]{1}destruct/, someoneHasGoneCallback);
