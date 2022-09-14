const { get, uniq } = require("lodash");
const { app } = require("../../index");
const {

} = require("./constants");

/**
 * handleWordlePosted
 * 
 * @param {*} param0 
 */
const handleWordlePosted = async ({ payload, context }) => {
    app.client.reactions.add({
      token: context.botToken,
      channel: payload.channel,
      name: "word",
      timestamp: payload.ts,
    });
}

module.exports = { handleWordlePosted };
