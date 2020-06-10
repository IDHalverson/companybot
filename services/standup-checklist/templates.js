const standupTemplate = (userIds) => `Who needs to give their update:
    
${userIds.map((userId) => `:black_small_square: <@${userId}>`).join("\n")}

commands: [check off|uncheck|where is] @user [is on vacation]`;

module.exports = {
  standupTemplate
};
