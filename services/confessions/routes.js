const { app } = require("../../index");
const { provideConfessionLine } = require("./buslogic");

app.message("!Confession", provideConfessionLine);
