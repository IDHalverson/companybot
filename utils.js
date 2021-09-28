module.exports = {
  getRandomInt: (max) => {
    return Math.floor(Math.random() * Math.floor(max));
  },
  asyncForEach: async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  },
  sendErrorToSlack: async ({ app, whileProcessing, error, sync = false, token }) => {
    const errorChannel = process.env.BOT_ERRORS_SLACK_CHANNEL;
    const sendError = async () => {
      errorChannel && app.client.chat.postMessage({
        token: token || process.env.ADMIN_USER_TOKEN,
        channel: errorChannel,
        text: `Error while processing message: "${whileProcessing}": \`\`\`Error: ${error.message || JSON.stringify(error)}\`\`\``
      })
    }
    if (sync) {
      await sendError()
    } else {
      sendError()
    }
  }
};
