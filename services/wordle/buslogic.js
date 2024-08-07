const { get, uniq, result } = require("lodash");
const { app } = require("../../index");
const {
  EXCLUDED_USERNAMES,
  START_FRESH,
  BURRIS_CHANNEL,
} = require("./constants");
const { sortScoreboard, doExcludeWordle } = require("./utils");

const replaceEmojiAndComma = (txt) => {
  const ret = txt
    .replace(/Wordle ([1-9]+),/, "Wordle $1")
    .replace(/Wordle ([0-9]+)(\s:[a-z-_]+:)/, "Wordle $1");
  // ret !== txt && console.log("\n\nReplacing\n\n", txt, "\n\nwith\n\n", ret);
  return ret;
};

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
  if (context.matches[0]) {
    context.matches[0] = replaceEmojiAndComma(context.matches[0]);
  }

  if (
    doExcludeWordle(context, {
      excludeSundays: true,
      excludeWeekends: BURRIS_CHANNEL === payload.channel,
    })
  ) {
    await app.client.chat.postEphemeral({
      token: context.botToken,
      channel: payload.channel,
      user: payload.user,
      text:
        "Wordle scores are only tracked " +
        (BURRIS_CHANNEL === context.channel ? "Mon-Fri" : "Mon-Sat"),
    });
  }

  let wordleChannelHistory = [];
  let cursor;
  let doneOnce = false;
  while (cursor || !doneOnce) {
    doneOnce = true;
    const results = await app.client.conversations.history({
      token: context.botToken,
      channel: payload.channel,
      oldest: Date.now() / 1000 - 60 * 60 * 24 * 30, // about a month
      inclusive: true,
      limit: 200,
      cursor,
    });
    wordleChannelHistory = wordleChannelHistory.concat(results.messages);
    cursor = results.response_metadata.next_cursor;
  }

  wordleChannelHistory.forEach((historyItem) => {
    if (historyItem.text)
      historyItem.text = replaceEmojiAndComma(historyItem.text);
  });

  /**
   * REPLAY LOGIC
   */
  if (isReplay && !isReplayRoutineForOneMessage) {
    let accumulatedScoreboard;
    const usersDoneAlready = [];
    for (let i = 0; i < wordleChannelHistory.length; i++) {
      const message = wordleChannelHistory[i];
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
            isHardMode: Boolean(
              message.text.match(/Wordle [0-9]+ [0-6X]\/6\*/)
            ),
          },
          isReplayRoutineForOneMessage: true,
          accumulatedScoreboard,
        });
        accumulatedScoreboard = result.scoreboard;
        usersDoneAlready.push(result.user);
      }
    }
    const finalScoreboard = !accumulatedScoreboard
      ? null
      : sortScoreboard(accumulatedScoreboard);

    // Delete old scoreboard(s)
    let existingScoreBoardsForReplayItem = [];
    let doneOneTime = false;
    let cursor;
    while (cursor || !doneOneTime) {
      doneOneTime = true;
      const result = await app.client.conversations.history({
        token: context.botToken,
        channel: payload.channel,
        oldest: Date.now() / 1000 - 60 * 60 * 24 * 30, // about a month
        inclusive: true,
        limit: 200,
        cursor,
      });
      existingScoreBoardsForReplayItem =
        existingScoreBoardsForReplayItem.concat(result.messages);
      cursor = result.response_metadata?.next_cursor;
    }
    const existingOnes = existingScoreBoardsForReplayItem?.filter((m) =>
      m.text.startsWith(`*Scoreboard: Wordle ${wordleToReplay}`)
    );
    for (let i = 0; i < existingOnes.length; i++) {
      await app.client.chat.delete({
        token: process.env.ADMIN_USER_TOKEN,
        ts: existingOnes[i].ts,
        channel: payload.channel,
      });
    }

    // Post replayed scoreboard
    finalScoreboard
      ? await app.client.chat.postMessage({
          token: context.botToken,
          channel: payload.channel,
          username: "Wordle",
          icon_emoji: ":wordle-icon:",
          text: finalScoreboard,
        })
      : await app.client.chat.postMessage({
          token: context.botToken,
          channel: payload.channel,
          username: "Wordle",
          icon_emoji: ":wordle-icon:",
          text: "No valid Wordles to replay.",
        });

    /**
     * END REPLAY LOGIC
     */
  } else {
    const wordleNumberPosted =
      context.matches[0].match(/Wordle ([0-9]+) /)?.[1];
    const rawScore = context.matches[0].match(/Wordle [0-9]+ ([0-6X])\/6/)?.[1];
    const isHardMode = isReplayRoutineForOneMessage
      ? Boolean(context.isHardMode)
      : context.matches[0]?.endsWith?.("*");
    let score = {
      ["1"]: 10,
      ["2"]: 7,
      ["3"]: 5,
      ["4"]: 4,
      ["5"]: 3,
      ["6"]: 2,
      ["X"]: 1,
    }[rawScore];
    if (isHardMode) score += 0.5;
    // 7 - (rawScore === "X" ? 7 : Number(rawScore));
    const existingScoreBoard = isReplayRoutineForOneMessage
      ? accumulatedScoreboard
        ? { text: accumulatedScoreboard }
        : null
      : wordleChannelHistory.find((message) =>
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
        username: "Wordle",
        icon_emoji: ":wordle-icon:",
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
        name: "wordle-icon",
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

const postLongrunningScoreboard =
  (includeDetails = false) =>
  async ({ payload, context }) => {
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
      conversationsLast2Weeks = conversationsLast2Weeks.concat(
        results.messages
      );
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
      const excludeThis = doExcludeWordle(
        null,
        {
          excludeSundays: true,
          excludeWeekends: BURRIS_CHANNEL === context.channel,
        },
        wordleNum
      );
      if (!excludeThis && scoreboard) {
        const usersAndScores = scoreboard.text.match(
          /\n\`[0-9\.]+\`  [^\n:]+/g
        );
        const usersAndScoresMap = {};
        if (usersAndScores)
          usersAndScores.forEach((match) => {
            const _score = match.match(/\n\`([0-9\.]+)\`/)[1];
            /* CONVERT TO NEW SCORE SYSTEM */
            const score =
              wordle >= START_FRESH
                ? _score
                : {
                    ["0"]: "1",
                    ["1"]: "2",
                    ["2"]: "3",
                    ["3"]: "4",
                    ["4"]: "5",
                    ["5"]: "7",
                    ["6"]: "10",
                  }[_score];
            const username = match
              .match(/\n\`[0-9\.]+\`  ([^\n:]+)/)[1]
              ?.trim();
            usersAndScoresMap[username] = score;
          });
        scoreboardsMap[wordle] = usersAndScoresMap;
      }
    });

    const userTotalScores = {};
    Object.entries(scoreboardsMap).forEach(([wordle, scoreboard]) => {
      Object.entries(scoreboard).forEach(([username, score]) => {
        userTotalScores[username] = [
          ...(userTotalScores[username] || []),
          score,
        ];
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
            top7Cloned[lowestOfTop7Index] = {
              s: Number(score),
              ix: scoreIndex,
            };
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

    const translateScoreBackwardsMap = {
      10: 1,
      10.5: "1*",
      7: 2,
      7.5: "2*",
      5: 3,
      5.5: "3*",
      4: 4,
      4.5: "4*",
      3: 5,
      3.5: "5*",
      2: 6,
      2.5: "6*",
      1: "X",
      1.5: "X*",
    };

    const scoreboardFinalText =
      sortScoreboard(`*2 Week Wordle Scoreboard*

${Object.entries(userScoreTotals)
  .filter(([username]) => !EXCLUDED_USERNAMES.includes(username))
  .map(([username, score], ix) => `\n\`${score}\`  ${username}`)
  .join("")}`) +
      `
  
  ${
    includeDetails
      ? `
  
  ${Object.entries(usersTopScoresMap)
    .filter(([username]) => !EXCLUDED_USERNAMES.includes(username))
    .map(
      ([username, topScores]) =>
        `\n${topScores
          .sort()
          .reverse()
          .map((sc) => `\`${translateScoreBackwardsMap[sc]} (${sc})\``)
          .join("  ")}  ${username}`
    )
    .join("")}`
      : ""
  }`;

    await app.client.chat.postMessage({
      token: context.botToken,
      channel: payload.channel,
      text: scoreboardFinalText,
      username: "Wordle",
      icon_emoji: ":wordle-icon:",
    });
  };

module.exports = {
  handleWordlePosted,
  replayScoreboard,
  postLongrunningScoreboard,
};
