const { app } = require("../../index");
const { postRandomFact } = require("./buslogic");

app.message("!Fact", postRandomFact);
