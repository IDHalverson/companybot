const sortScoreboard = (scoreboard) => {
  console.log(scoreboard);
  const lines = scoreboard.match(/\n\`[^\n]+/g);
  lines.sort().reverse();

  const firstPlaceIndexes = lines
    .map((line, index) =>
      Number(line.match(/\`([0-9]+)\`/)[1]) ===
      Number(lines[0].match(/\`([0-9]+)\`/)[1])
        ? index
        : null
    )
    .filter((it) => it != null);
  const secondPlaceIndexes = lines
    .map((line, index) =>
      Number(line.match(/\`([0-9]+)\`/)[1]) ===
      Number(
        lines[firstPlaceIndexes.slice(-1)[0] + 1]?.match(/\`([0-9]+)\`/)[1]
      )
        ? index
        : null
    )
    .filter((it) => it != null);
  const thirdPlaceIndexes = lines
    .map((line, index) =>
      Number(line.match(/\`([0-9]+)\`/)[1]) ===
      Number(
        lines[secondPlaceIndexes.slice(-1)[0] + 1]?.match(/\`([0-9]+)\`/)[1]
      )
        ? index
        : null
    )
    .filter((it) => it != null);

  firstPlaceIndexes.forEach((idx) => {
    lines[idx] += " :first_place_medal:";
  });
  secondPlaceIndexes.forEach((idx) => {
    lines[idx] += " :second_place_medal:";
  });
  thirdPlaceIndexes.forEach((idx) => {
    lines[idx] += " :third_place_medal:";
  });

  const finalScoreboard = `${scoreboard.split("\n\n")[0]}\n\n${lines.join("")}`;
  return finalScoreboard;
};

module.exports = {
  sortScoreboard,
};
