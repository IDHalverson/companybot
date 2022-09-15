module.exports = {
  INTERVAL_IN_MS: 1000 * 60 * 10, // Check every 10 minutes
  TRAFFIC_CHECKS_CHANNEL: "C042M29969J",
  TRIGGER: {
    timespanInMS: 1000 * 60 * 20, // 20 Minutes
    quantity: 12, // 12 messages
  },
  ACTIVE_CONVOS_CHANNEL: "C042JP62B9Q",
  RENOTIFY_WAIT_IN_MS: 1000 * 60 * 60 * 2, // 2 hours
  // TODO: RENOTIFY_BYPASS_IF_BREAK_IN_SECONDS: 60 * 30 // 30 minutes
};
