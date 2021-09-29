const Utils = require("../../utils");

class CompanyBot {
  constructor() {
    this.companyBotGreetings = process.env.BOT_GREETINGS.split("<<<<,>>>>");
    this.companyBotGoodMorningGreeting = process.env.BOT_GOODMORNING_GREETING;
    this.companyNameLowerCaseNoSpaces = process.env.COMPANYNAME_LOWERCASE_NOSPACES;
  }

  getCompanyBotGreeting() {
    const randomIndex = Utils.getRandomInt(this.companyBotGreetings.length);
    return this.companyBotGreetings[randomIndex];
  }

  getGoodMorningGreeting() {
    return this.companyBotGoodMorningGreeting;
  }
}

module.exports = CompanyBot;
