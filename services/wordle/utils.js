const sortScoreboard = (scoreboard) => {
  const lines = scoreboard.match(/\n\`[^\n]+/g);
  console.log(lines);
  lines.sort((a, b) => {
    return (
      Number(b.match(/\`([0-9\.]+)\`/)[1]) -
      Number(a.match(/\`([0-9\.]+)\`/)[1])
    );
  });

  const IDEAL_MEDAL_COUNT = 3;

  const firstPlaceIndexes = lines
    .map((line, index) =>
      Number(line.match(/\`([0-9\.]+)\`/)[1]) ===
      Number(lines[0].match(/\`([0-9\.]+)\`/)[1])
        ? index
        : null
    )
    .filter((it) => it != null);
  const secondPlaceIndexes =
    firstPlaceIndexes.length >= IDEAL_MEDAL_COUNT
      ? []
      : lines
          .map((line, index) =>
            Number(line.match(/\`([0-9\.]+)\`/)[1]) ===
            Number(
              lines[firstPlaceIndexes.slice(-1)[0] + 1]?.match(
                /\`([0-9\.]+)\`/
              )[1]
            )
              ? index
              : null
          )
          .filter((it) => it != null);
  const thirdPlaceIndexes =
    [...firstPlaceIndexes, ...secondPlaceIndexes].length >= IDEAL_MEDAL_COUNT
      ? []
      : lines
          .map((line, index) =>
            Number(line.match(/\`([0-9\.]+)\`/)[1]) ===
            Number(
              lines[secondPlaceIndexes.slice(-1)[0] + 1]?.match(
                /\`([0-9\.]+)\`/
              )[1]
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

  let finalScoreboard = `${scoreboard.split("\n\n")[0]}\n\n${lines.join("")}`;

  finalScoreboard = finalScoreboard.replace(
    /_place_medal: :(first|second|third)_place_medal:/g,
    "_place_medal:"
  );
  return finalScoreboard;
};

module.exports = {
  sortScoreboard,
};
