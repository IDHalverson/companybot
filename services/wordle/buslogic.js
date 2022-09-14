const { get, uniq, result } = require("lodash");
const { app } = require("../../index");
const {} = require("./constants");

/**
 * Ordinary flow for a Wordle posted is not recursive.
 *
 * For "isReplay", the latter half of logic is skipped. Instead,
 * the method calls itself once for each previous Wordle post
 * found, and accumulates a new scoreboard, and then exits the
 * recursive logic, posts the scoreboard.
 */

/**
 * handleWordlePosted
 *
 * @param {*} param0
 */
const handleWordlePosted = async ({
  payload,
  context,
  /* Used for replay */
  isReplay,
  wordleToReplay,
  /* Used for each recursive call during replay */
  isReplayRoutineForOneMessage,
  accumulatedScoreboard,
}) => {
  let conversationsLast24Hours = [];
  let cursor;
  let doneOnce = false;
  while (cursor || !doneOnce) {
    doneOnce = true;
    const results = await app.client.conversations.history({
      token: context.botToken,
      channel: payload.channel,
      oldest: Date.now() / 1000 - 60 * 60 * 25, // now - 25 hours
      inclusive: true,
      limit: 200,
      cursor,
    });
    conversationsLast24Hours = conversationsLast24Hours.concat(
      results.messages
    );
    cursor = results.response_metadata.next_cursor;
  }

  if (isReplay && !isReplayRoutineForOneMessage) {
    let accumulatedScoreboard;
    const usersDoneAlready = [];
    for (let i = 0; i < conversationsLast24Hours.length; i++) {
      const message = conversationsLast24Hours[i];
      if (
        message.text.startsWith(`Wordle ${wordleToReplay}`) &&
        !usersDoneAlready.includes(message.user)
      ) {
        const result = await handleWordlePosted({
          payload: {
            text: message.text,
            channel: payload.channel,
            user: message.user,
            ts: message.ts,
          },
          context: {
            botToken: context.botToken,
            matches: [message.text.match(/Wordle [0-9]+ ([0-6X])\/6/g)[0]],
          },
          isReplayRoutineForOneMessage: true,
          accumulatedScoreboard,
        });
        accumulatedScoreboard = result.scoreboard;
        usersDoneAlready.push(result.user);
      }
    }
    app.client.chat.postMessage({
      token: context.botToken,
      channel: payload.channel,
      username: "Word",
      icon_emoji: ":word:",
      text: accumulatedScoreboard,
    });
  } else {
    const wordleNumberPosted =
      context.matches[0].match(/Wordle ([0-9]+) /)?.[1];
    const rawScore = context.matches[0].match(/Wordle [0-9]+ ([0-6X])\/6/)?.[1];
    const score = 7 - (rawScore === "X" ? 7 : Number(rawScore));
    const existingScoreBoard = isReplayRoutineForOneMessage
      ? accumulatedScoreboard
        ? { text: accumulatedScoreboard }
        : null
      : conversationsLast24Hours.find((message) =>
          message.text.startsWith(`*Scoreboard: Wordle ${wordleNumberPosted}`)
        );

    const userInfo = await app.client.users.info({
      token: context.botToken,
      user: payload.user,
    });

    let scoreBoardText = "";
    const usernameToShow =
      userInfo.user.profile.display_name || userInfo.user.profile.real_name;
    if (existingScoreBoard) {
      scoreBoardText = `${existingScoreBoard.text}\n\`${score}\`  ${usernameToShow}`;
    } else {
      scoreBoardText = `*Scoreboard: Wordle ${wordleNumberPosted}*\n\n\`${score}\`  ${usernameToShow}`;
    }

    if (isReplayRoutineForOneMessage) {
      return Promise.resolve({
        scoreboard: scoreBoardText,
        user: payload.user,
      });
    } else {
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: payload.channel,
        text: scoreBoardText,
        username: "Word",
        icon_emoji: ":word:",
      });

      if (existingScoreBoard)
        await app.client.chat.delete({
          token: process.env.ADMIN_USER_TOKEN,
          ts: existingScoreBoard.ts,
          channel: payload.channel,
        });

      await app.client.reactions.add({
        token: context.botToken,
        channel: payload.channel,
        name: "word",
        timestamp: payload.ts,
      });
    }
  }
};

const replayScoreboard = async ({ context, payload }) => {
  handleWordlePosted({
    context,
    payload,
    isReplay: true,
    wordleToReplay: payload.text.match(/([0-9]+)$/)[0],
  });
};

module.exports = { handleWordlePosted, replayScoreboard };
