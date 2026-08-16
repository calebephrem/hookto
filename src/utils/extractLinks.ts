export function extractLinks(text: string) {
  const urlRegex =
    /https?:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?::\d+)?(?:\/[^\s<>]*)?/gi;

  const matches = text.match(urlRegex) || [];

  return matches.filter((match) => {
    try {
      const parsed = new URL(match);
      return !!parsed;
    } catch {
      return false;
    }
  });
}
