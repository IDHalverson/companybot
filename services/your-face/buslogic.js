const axios = require("axios");
const { get, uniq } = require("lodash");
const { app } = require("../../index");
const {} = require("./constants");

const handleYourFace = async ({ payload, context }) => {
  const yourFaceResponse = await axios.get(
    "https://api.bitranchlabs.com/api/v1/yourface"
  );
  app.client.chat.postMessage({
    token: context.botToken,
    channel: payload.channel,
    text: yourFaceResponse.data,
    thread_ts: payload.thread_ts,
  });
};

module.exports = {
  handleYourFace,
};
