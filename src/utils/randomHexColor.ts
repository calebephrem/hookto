export function randomHexColor(): string {
  const getRandomChannel = () =>
    Math.floor(Math.random() * (200 - 80 + 1) + 80);

  const r = getRandomChannel().toString(16).padStart(2, "0");
  const g = getRandomChannel().toString(16).padStart(2, "0");
  const b = getRandomChannel().toString(16).padStart(2, "0");

  return `${r}${g}${b}`;
}
