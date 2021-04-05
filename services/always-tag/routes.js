const { app } = require("../../index");
const { replyToTagSyntaxWithRealTag, undoRealTagReply } = require("./buslogic");

app.message(
    /\@[\@]*[a-zA-Z0-9\-\_\'\.\?]{1}[a-zA-Z0-9\-\_\s\t\'\.\?]*/g,
    replyToTagSyntaxWithRealTag
);

app.message(
    /^[\s\'\`\"]*undo[\s\'\`\"]*$/gi,
    undoRealTagReply()
)

app.message(
    /^[\s\'\`\"]*undo[\s]*smart[\s\'\`\"]*$/gi,
    undoRealTagReply(/*smart=*/true)
)