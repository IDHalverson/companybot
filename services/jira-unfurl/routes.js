const { app } = require("../../index");
const { jiraUnfurlCallback } = require("./buslogic");

app.message(/((?<!([A-Z]{1,10})-?)[A-Z]+-\d+)/, jiraUnfurlCallback);
