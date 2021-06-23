const { app } = require("../../index");
const { getUserContext } = require("../../middleware");
const { get } = require("lodash");
const {
    moveToThreadMessageShortcutCallback,
    moveToThreadFormSubmissionCallback,
    moveToThreadMoreOptionsCallback,
    moveToThreadSelectDeleteMessagesCallback,
    moveToThreadConfirmDeleteMessagesCallback,
    moveToThreadDeliverToUsersCallback
} = require("./buslogic");

const getUserContextMiddleware = getUserContext(
    (payload, context, command) => get(payload, "user.id") || command.user_id || payload.private_metadata.split("<?sep>")[2],
    true,
    ":warning: Couldn't create thread.\n\n",
    payload => payload.response_url || payload.private_metadata.split("<?sep>")[3]
);

app.shortcut("move_to_thread_shortcut", getUserContextMiddleware, moveToThreadMessageShortcutCallback);

app.view("move_to_thread", getUserContextMiddleware, moveToThreadFormSubmissionCallback);

app.action("move_to_thread_more_options", moveToThreadMoreOptionsCallback)

app.action("delete_messages_value", moveToThreadSelectDeleteMessagesCallback)

app.action(/delete_messages_value_[0-9]+/, moveToThreadSelectDeleteMessagesCallback)

app.view({ callback_id: "move_to_thread_confirm_delete", type: "view_submission" }, moveToThreadConfirmDeleteMessagesCallback)

app.view({ callback_id: "move_to_thread_confirm_delete", type: "view_closed" }, moveToThreadConfirmDeleteMessagesCallback)

app.action("move_to_thread_deliver_to_users", moveToThreadDeliverToUsersCallback)
