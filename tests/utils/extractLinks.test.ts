import { describe, expect, it } from "vitest";
import { extractLinks } from "../../src/utils/extractLinks";

describe("extractLinks", () => {
  it("should return [] for invalid links", () => {
    ["hi", "https://google", "lorem.com"].map((msg) => {
      const extracted = extractLinks(msg);

      expect(extracted).toHaveLength(0);
    });
  });

  it("should return list of extracted links", () => {
    const message =
      "When building modern web applications, developers frequently rely on robust tools like the React Official Documentation to build user interfaces, while handling data fetching with tools like Axios GitHub Repository, found at https://github.com/axios/axios, or native fetch. For keeping track of project issues, teams often head straight to atlassian.com to log tickets. However, beginners sometimes make mistakes in their documentation, writing broken markdown like Google because they forgot the protocol, or swapping the brackets like (MDN Web Docs)[https://mozilla.org], which completely breaks the rendering. It is also common to see incomplete links like [StackOverflow](https://stackoverflow.com) or typos in the formatting tag like [Wikipedia](https://wikipedia). Despite these formatting hurdles, learning resource sites like https://w3schools.com and communities found at Reddit remain highly accessible and incredibly valuable for continuous learning.";

    const extracted = extractLinks(message);

    expect(extracted).toEqual([
      "https://github.com/axios/axios,",
      "https://mozilla.org",
      "https://stackoverflow.com",
      "https://w3schools.com",
    ]);
  });
});
