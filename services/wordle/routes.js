const { app } = require("../../index");
const { handleWordlePosted } = require("./buslogic");

app.message(/Wordle [0-9]{3,6} [1-6X]\/6\*?/g, handleWordlePosted);
