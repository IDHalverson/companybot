const { app } = require("../../index");
const { replaceTagSyntaxWithRealTag } = require("./buslogic");
const { REPLACE_TAG_WAIT_TIME } = require("./constants");

app.message(
    /\@[a-zA-Z0-9\-\_\s\t\'\.]+/g,
    (...a) => setTimeout(() =>
        replaceTagSyntaxWithRealTag(...a),
        REPLACE_TAG_WAIT_TIME
    )
);
