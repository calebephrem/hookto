import { describe, expect, it } from "vitest";
import { buildEmbed, UnfurlResult } from "../../src/utils/buildEmbed.js";

describe("buildEmbed", () => {
  it("should generate a complete HTML block quote with all metadata present", () => {
    const mockData: Partial<UnfurlResult> = {
      title: "Awesome Tool",
      description: "A tool that changes everything.",
      favicon: "https://example.com",
      open_graph: {
        url: "https://example.com",
        site_name: "Example Corp",
        images: [{ url: "https://example.com" }],
      } as Record<string, unknown> as UnfurlResult["open_graph"],
    };

    const result = buildEmbed(mockData as UnfurlResult);

    expect(result).toBe(
      "<blockquote>" +
        '<img src="https://example.com" width="70" align="right">' +
        '<div><img src="https://example.com" height="14"> Example Corp</div>' +
        '<div><strong><a href="https://example.com">Awesome Tool</a></strong></div>' +
        "<div>A tool that changes everything.</div>" +
        "</blockquote>",
    );
  });

  it("should fallback to defaults when properties are completely missing", () => {
    const mockData: Partial<UnfurlResult> = {};

    const result = buildEmbed(mockData as UnfurlResult);

    expect(result).toBe(
      "<blockquote>" +
        "<div><strong>Link Preview</strong></div>" +
        "</blockquote>",
    );
  });

  it("should fallback to the Twitter card image if Open Graph images do not exist", () => {
    const mockData: Partial<UnfurlResult> = {
      title: "Twitter Post",
      twitter_card: {
        images: [{ url: "https://example.com" }],
      } as Record<string, unknown> as UnfurlResult["twitter_card"],
    };

    const result = buildEmbed(mockData as UnfurlResult);

    expect(result).toContain(
      '<img src="https://example.com" width="70" align="right">',
    );
  });

  it("should omit the favicon img tag if favicon is missing but site_name exists", () => {
    const mockData: Partial<UnfurlResult> = {
      title: "No Favicon Site",
      open_graph: {
        site_name: "Plain Site",
      } as Record<string, unknown> as UnfurlResult["open_graph"],
    };

    const result = buildEmbed(mockData as UnfurlResult);

    expect(result).toContain("<div>Plain Site</div>");
    expect(result).not.toContain('<img src="" height="14">');
  });

  it("should render a plain title without an anchor tag if open_graph.url is missing", () => {
    const mockData: Partial<UnfurlResult> = {
      title: "Standalone Title",
    };

    const result = buildEmbed(mockData as UnfurlResult);

    expect(result).toContain("<div><strong>Standalone Title</strong></div>");
    expect(result).not.toContain("<a href=");
  });
});
