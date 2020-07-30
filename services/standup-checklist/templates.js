const standupTemplate = (userIds) => `*BSCP Standup:*

${userIds.map((userId) => `:black_small_square: <@${userId}>`).join("\n")}

*commands: *
- [ check off | uncheck | where is ] @user
- @user [ is on vacation | is taking a sick day | is busy ]
- self-destruct`;

module.exports = {
  standupTemplate
};
