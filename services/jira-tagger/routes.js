const { app } = require("../../index");
const { jiraTagger } = require("./buslogic");

app.message(/^(?![\s\S])/, jiraTagger);
