module.exports = {
  INTERVAL_IN_MS: 1000 * 60 * 3, // Check every 3 minutes
  TRAFFIC_CHECKS_CHANNEL: "C042M29969J",
  TRIGGER: {
    timespanInMS: 1000 * 60 * 10, // 10 Minutes
    uniqueWordsPerMinuteRate: 10,
    minimumActualTimespanInSeconds: 60 * 2, // 2 minutes
    minimumParticipants: 2,
  },
  ACTIVE_CONVOS_CHANNEL: "C042JP62B9Q",
  RENOTIFY_WAIT_IN_MS: 1000 * 60 * 30 * 1, // 30 minutes
  // TODO?: RENOTIFY_BYPASS_IF_BREAK_IN_SECONDS: 60 * 30 // 30 minutes
  BOT_TESTING_CHANNEL: "C04262DK4SH",
  NUMBER_OF_KEYWORDS: 10,
  MAXIMUM_KEYWORD_LENGTH: 12,
};
