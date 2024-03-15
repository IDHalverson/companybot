const { app } = require("../../index");
const {
  handleWordlePosted,
  replayScoreboard,
  postLongrunningScoreboard,
} = require("./buslogic");

// This also handles when Wordle throws an emoji in there
app.message(
  /Wordle [0-9]{1,3},[0-9]{3,6}(?:\s:[a-z_\-]+:)? [1-6X]\/6\*?/g,
  handleWordlePosted
);

app.message(/!Wordle replay [0-9]+/g, replayScoreboard);

app.message("!Wordle scores", postLongrunningScoreboard());

app.message("!Wordle details", postLongrunningScoreboard(true));
