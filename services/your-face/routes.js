const { app } = require("../../index");
const { handleYourFace } = require("./buslogic");

app.message(/your face/gi, handleYourFace);
