const Utils = require("../../utils");

class BurrisBot {
  constructor() {
    this.burrisBotGreetings = [
      "Make It Happen! :burris_snowflake_png:",
      "Get It Right! :burris_snowflake_png:",
      "I Am Burris! :burris_snowflake_png:"
    ];
    this.burrisBotGoodMorningGreeting =
      "Good morning everyone! :burris_snowflake_png:";
  }

  getBurrisBotGreeting() {
    const randomIndex = Utils.getRandomInt(this.burrisBotGreetings.length);
    return this.burrisBotGreetings[randomIndex];
  }

  getGoodMorningGreeting() {
    return this.burrisBotGoodMorningGreeting;
  }
}

module.exports = BurrisBot;
