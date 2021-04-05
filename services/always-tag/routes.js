const { app } = require("../../index");
const { replyToTagSyntaxWithRealTag, undoRealTagReply } = require("./buslogic");
const { REPLACE_TAG_WAIT_TIME } = require("./constants");

app.message(
    /\@[\@]*[a-zA-Z0-9\-\_\s\t\'\.]+/g,
    (...a) => setTimeout(() =>
        replyToTagSyntaxWithRealTag(...a),
        REPLACE_TAG_WAIT_TIME
    )
);

app.message(
    /^[\s\'\`\"]*undo[\s\'\`\"]*$/gi,
    undoRealTagReply()
)

app.message(
    /^[\s\'\`\"]*undo[\s]*smart[\s\'\`\"]*$/gi,
    undoRealTagReply(/*smart=*/true)
)