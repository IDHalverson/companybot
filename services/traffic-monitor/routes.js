const { app } = require("../../index");
const { handleTrafficMonitor } = require("./buslogic");

app.message("", handleTrafficMonitor);
