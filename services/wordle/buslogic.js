const { get, uniq, result } = require("lodash");
const { app } = require("../../index");
const {} = require("./constants");
const { sortScoreboard } = require("./utils");

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

  /**
   * REPLAY LOGIC
   */
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
    const finalScoreboard = sortScoreboard(accumulatedScoreboard);

    app.client.chat.postMessage({
      token: context.botToken,
      channel: payload.channel,
      username: "Word",
      icon_emoji: ":word:",
      text: finalScoreboard,
    });
    /**
     * END REPLAY LOGIC
     */
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
      scoreBoardText = `${existingScoreBoard.text.replace(
        / :(first|second|third)_place_medal:/g,
        ""
      )}\n\`${score}\`  ${usernameToShow}`;
    } else {
      scoreBoardText = `*Scoreboard: Wordle ${wordleNumberPosted}*\n\n\`${score}\`  ${usernameToShow}`;
    }

    scoreBoardText = sortScoreboard(scoreBoardText);

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

const postLongrunningScoreboard = async ({ payload, context }) => {
  let conversationsLast2Weeks = [];
  let cursor;
  let doneOnce = false;
  while (cursor || !doneOnce) {
    doneOnce = true;
    const results = await app.client.conversations.history({
      token: context.botToken,
      channel: payload.channel,
      oldest: Date.now() / 1000 - 60 * 60 * 24 * 15, // now - 15 days
      inclusive: true,
      limit: 200,
      cursor,
    });
    conversationsLast2Weeks = conversationsLast2Weeks.concat(results.messages);
    cursor = results.response_metadata.next_cursor;
  }

  const allScoreboards = conversationsLast2Weeks.filter((message) => {
    return message.text.match(/^\*Scoreboard: Wordle ([0-9]+)/);
  });

  const mostRecentWordle = allScoreboards.reduce((wordle, scoreboard) => {
    const number = scoreboard.text.match(/\*Scoreboard: Wordle ([0-9]+)/)[1];
    if (Number(number) > wordle) return Number(number);
    else return wordle;
  }, 0);

  const wordlesToInclude = [...new Array(14)]
    .fill()
    .map((_, i) => mostRecentWordle - i);

  const scoreboardsToInclude = {};

  wordlesToInclude.forEach((wordle) => {
    allScoreboards.forEach((scoreboard) => {
      if (scoreboard.text.startsWith(`*Scoreboard: Wordle ${wordle}`)) {
        if (
          !scoreboardsToInclude[`${wordle}`] ||
          scoreboard.ts > scoreboardsToInclude[`${wordle}`].ts
        ) {
          scoreboardsToInclude[`${wordle}`] = scoreboard;
        }
      }
    });
  });

  const scoreboardsMap = {};

  Object.entries(scoreboardsToInclude).forEach(([wordle, scoreboard]) => {
    const wordleNum = Number(wordle);
    const aSundayWordle = 449;
    let sundayWordle = aSundayWordle;
    let excludeThis = false;
    while (sundayWordle <= wordleNum) {
      if (sundayWordle === wordleNum) {
        excludeThis = true;
        break;
      } else {
        sundayWordle += 7;
      }
    }
    if (!excludeThis && scoreboard) {
      const usersAndScores = scoreboard.text.match(/\n\`[0-7]\`  [^\n:]+/g);
      const usersAndScoresMap = {};
      if (usersAndScores)
        usersAndScores.forEach((match) => {
          const score = match.match(/\n\`([0-7])\`/)[1];
          const username = match.match(/\n\`[0-7]\`  ([^\n:]+)/)[1]?.trim();
          usersAndScoresMap[username] = score;
        });
      scoreboardsMap[wordle] = usersAndScoresMap;
    }
  });

  const userTotalScores = {};
  Object.entries(scoreboardsMap).forEach(([wordle, scoreboard]) => {
    Object.entries(scoreboard).forEach(([username, score]) => {
      userTotalScores[username] = [...(userTotalScores[username] || []), score];
    });
  });

  const usersTopScoresMap = {};

  Object.entries(userTotalScores).forEach(([username, scores]) => {
    const top7Scores = scores.reduce(
      (top7, score, scoreIndex) => {
        const top7Cloned = [...top7];
        const lowestOfTop7Index = top7Cloned.findIndex((s, i) =>
          top7Cloned.every((t, tI) => {
            return tI === i || Number(t.s) >= Number(s.s);
          })
        );
        const alreadyInTop7 = top7Cloned.some(
          (topNum) => topNum.ix === scoreIndex
        );
        if (score > top7Cloned[lowestOfTop7Index].s && !alreadyInTop7) {
          top7Cloned[lowestOfTop7Index] = { s: Number(score), ix: scoreIndex };
        }
        return top7Cloned;
      },
      [...scores.slice(0, 7).map((it, i) => ({ s: Number(it), ix: i }))]
    );
    usersTopScoresMap[username] = top7Scores.map((sc) => sc.s);
  });

  const userScoreTotals = {};
  Object.entries(usersTopScoresMap).forEach(([username, topScores]) => {
    userScoreTotals[username] = topScores.reduce((total, score) => {
      return total + score;
    }, 0);
  });

  console.log(userScoreTotals);

  const scoreboardFinalText = sortScoreboard(`*2 Week Wordle Scoreboard*

${Object.entries(userScoreTotals)
  .map(([username, score], ix) => `\n\`${score}\`  ${username}`)
  .join("")}`);

  await app.client.chat.postMessage({
    token: context.botToken,
    channel: payload.channel,
    text: scoreboardFinalText,
    username: "Word",
    icon_emoji: ":word:",
  });
};

module.exports = {
  handleWordlePosted,
  replayScoreboard,
  postLongrunningScoreboard,
};
