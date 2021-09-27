const { app } = require("../../index");
const { handleMessage } = require("./buslogic");

app.message(
    /^\!emoji/g,
    handleMessage
);
