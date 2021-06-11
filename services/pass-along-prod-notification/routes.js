const { app } = require("../../index");
const { ifConfiguredPassAlongMessage } = require("./buslogic.js");

const ONLY_EMPTY_MESSAGES_REGEX = /^$/;

app.message(ONLY_EMPTY_MESSAGES_REGEX, ifConfiguredPassAlongMessage);
