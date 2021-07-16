// If you change this, the logic may need to adjust how it detects/pattern-matches these messages
const standupTemplate = (users, isAutomated) => `${isAutomated ? "(automatically posted)\n\n" : ""
  }${users.map((user) => `:black_small_square: ${user.real_name}`).join("\n")
  }`;

// If you change this, the logic may need to adjust how it detects/pattern-matches these messages
const standupHelperText = (users, isAutomated) => `*Usage: *
Abbreviations work: \`John\`, \`John Smith\`, \`John S\`, \`J Smith\`, \`Smith\`, \`JS\`, \`J.S.\`

Examples: (type these *in the thread*)
\t\`check off\` John
\t\`uncheck\` John Smith
\t\`where is\` JS
\tJ. S. \`is on PTO\`
\tSmith \`is out sick\`
\tJ. Smith \`is busy\`
  
To delete checklist, type \`self-destruct\`${isAutomated ? "\n\n(automatically posted)" : ""
  }`

module.exports = {
  standupTemplate,
  standupHelperText
};
