const { app } = require("../../index");
const axios = require("axios");
const { get } = require("lodash");

const getUserContext = async ({
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
      user: get(payload, "user.id") || command.user_id,
      include_locale: true
    });
    context.user_id = user.user.id;
    context.user_email = user.user.profile.email;
    context.user_real_name = user.user.profile.real_name;
    await next();
  } catch (e) {
    ack();
    console.error(e);
    axios.post(payload.response_url, {
      response_type: "ephemeral",
      replace_original: false,
      text: `:email: Could not prepare email to send to ${process.env.SOLUTIONS_EMAIL}.\n\nError occurred: ${e}`
    });
  }
};

module.exports = { getUserContext };
