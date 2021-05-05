const standupTemplate = (users) => `${users.map((user) => `:black_small_square: ${user.real_name}`).join("\n")}`;

const standupHelperText = (users) => `*Usage: *
Abbreviations work: \`John\`, \`John Smith\`, \`John S\`, \`J Smith\`, \`Smith\`, \`JS\`, \`J.S.\`

Examples: (type these *in the thread*)
\t\`check off\` John
\t\`uncheck\` John Smith
\t\`where is\` JS
\tJ. S. \`is on PTO\`
\tSmith \`is out sick\`
\tJ. Smith \`is busy\`
  
To delete checklist, type \`self-destruct\``

module.exports = {
  standupTemplate,
  standupHelperText
};
