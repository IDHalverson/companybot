const { app } = require("../../index");
const { ifConfiguredPassAlongMessage } = require("./buslogic.js");

app.message(ifConfiguredPassAlongMessage);
