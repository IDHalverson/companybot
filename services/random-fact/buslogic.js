const axios = require("axios");
const { get, uniq } = require("lodash");
const { app } = require("../../index");
const {} = require("./constants");
const fs = require("fs");
const path = require("path");

const postRandomFact = async ({ payload, context }) => {
  const randomFactResp = await axios.get(
    "https://fungenerators.com/random/facts/"
  );

  // This only works while they use <h2> on the site.
  const randomFactMatch = randomFactResp.data.match(
    /Random fact\<\/[a-z0-9]+\>[\s]*\<h2[^\>]+\>(.)+\<\/h2\>+/g
  );

  const randomFact = randomFactMatch[0]?.match(/\>([^\<]+)\<span/)?.[1];

  const category = randomFactMatch[0]
    ?.match(/\(([a-zA-Z0-9\s\/\-]+\s+>\s+[a-zA-Z0-9\s\/\-]+)\s*\)/)?.[1]
    ?.trim?.();

  app.client.chat.postMessage({
    token: context.botToken,
    channel: payload.channel,
    text: `*Random Fact:* ${randomFact} ${
      category ? `(Category: ${category})` : ""
    }`,
    thread_ts: payload.thread_ts,
  });
};

module.exports = {
  postRandomFact,
};
