const { app } = require("../../index");
const {
  bscpStandupSlashCommandCallback,
  someoneHasGoneCallback
} = require("./buslogic");

app.command("/bscp-standup", bscpStandupSlashCommandCallback);

const userMentionRegex = "([a-zA-Z]+[\\\\.]*[ ]*[a-zA-Z]*[\\\\.]*)"

app.message(new RegExp(`(?:check off|co|c-o|c/o|c o) ${userMentionRegex}`), someoneHasGoneCallback("check off"));

app.message(new RegExp(`(?:uncheck|uc|u c|u-c|u/c) ${userMentionRegex}`), someoneHasGoneCallback("uncheck"));

app.message(new RegExp(`(?:where is|wi|w-i|w/i|w i) ${userMentionRegex}`), someoneHasGoneCallback("where is"));

app.message(new RegExp(`${userMentionRegex} (?:is on PTO|is PTO|PTO|iop|iopto|i-o-p|i/o/p|i o p)`, 'i'), someoneHasGoneCallback("is on PTO"));

app.message(
  new RegExp(`${userMentionRegex} (?:is out sick|ios|is sick|i o s)`),
  someoneHasGoneCallback("is out sick")
);

app.message(new RegExp(`${userMentionRegex} (?:is busy|ib|i b|i-b|i/b)`), someoneHasGoneCallback("is busy"));

app.message(/(self[\- ]{1}destruct)/, someoneHasGoneCallback());
