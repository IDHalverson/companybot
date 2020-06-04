const standupTemplate = (userIds) => `Who needs to give their update:
    
${userIds.map((userId) => `:black_small_square: <@${userId}>`).join("\n")}`;

module.exports = {
  standupTemplate
};
