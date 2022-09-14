const axios = require("axios");
const { get, uniq } = require("lodash");
const { app } = require("../../index");
const {} = require("./constants");
const fs = require("fs");
const path = require("path");

// TODO: add more confessions?

const provideConfessionLine = async ({ payload, context }) => {
  const westminster = fs.readFileSync(
    path.resolve(__dirname, "../../westminsterconfession.txt")
  );

  const text = westminster.toString();
  const allLines = Array.from(text.match(/[IVXL]+[^\n]+\n\n[^\n]+/g));
  let choice;
  const makeChoice = () => {
    const randomChoice = Math.round(Math.random() * allLines.length);
    choice = allLines[randomChoice];
  };
  while (!choice) {
    makeChoice();
  }
  app.client.chat.postMessage({
    token: context.botToken,
    channel: payload.channel,
    text: `*Random excerpt from the Westminster Confession of Faith, 1646*\n\n${choice}`,
    thread_ts: payload.thread_ts,
  });
};

module.exports = {
  provideConfessionLine,
};
