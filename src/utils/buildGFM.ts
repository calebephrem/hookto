type StandardBlock = {
  type: "note" | "warning" | "tip" | "important" | "caution";
  text: string;
};

type DetailsBlock = {
  type: "details";
  open?: boolean;
  content: {
    summary: string;
    items: string[];
  };
};

export type GFMBlock = StandardBlock | DetailsBlock;

export function buildGFM(arr: GFMBlock[]) {
  return arr
    .map((item) => {
      if (item.type === "details") {
        return [
          `<details${item.open !== false ? " open" : ""}>`,
          `<summary><strong>${item.content.summary.trim()}</strong></summary>`,
          "",
          item.content.items.map((i) => `- ${i.trim()}`).join("\n"),
          "",
          "</details>",
        ].join("\n");
      } else {
        return [
          `> [!${item.type.toUpperCase()}]`,
          item.text
            .split("\n")
            .map((i) => `> ${i.trim()}`)
            .join("\n"),
        ].join("\n");
      }
    })
    .join("\n\n");
}
