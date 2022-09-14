const { app } = require("../../index");
const {
  handleWordlePosted,
  replayScoreboard,
  postLongrunningScoreboard,
} = require("./buslogic");

app.message(/Wordle [0-9]{3,6} [1-6X]\/6\*?/g, handleWordlePosted);

app.message(/!Wordle replay [0-9]+/g, replayScoreboard);

app.message("!Wordle scores", postLongrunningScoreboard);
