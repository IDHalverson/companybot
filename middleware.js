const { app } = require("./index");
const axios = require("axios");
const { get } = require("lodash");

const getUserContext = (
    userIdGetter = (payload, context, command) => get(payload, "user.id") || command.user_id,
    doAck = true,
    prefix = `:email: Could not prepare email to send to ${process.env.SOLUTIONS_EMAIL}.\n\n`,
    responseUrlGetter = payload => payload.response_url
) => async ({
    context,
    command = {},
    next,
    ack,
    say,
    payload = {}
}) => {
        try {
            const user = await app.client.users.info({
                token: context.botToken,
                user: userIdGetter(payload, context, command),
                include_locale: true
            });
            context.user_id = user.user.id;
            context.user_email = user.user.profile.email;
            context.user_real_name = user.user.profile.real_name;
            await next();
        } catch (e) {
            doAck && ack();
            console.error(e.stack);
            axios.post(responseUrlGetter(payload), {
                response_type: "ephemeral",
                replace_original: false,
                text: `${prefix}Error occurred: ${e}`
            });
        }
    };

module.exports = { getUserContext };
