import { describe, expect, it } from "vitest";
import { deepMerge } from "../../src/utils/deepMerge.js";

describe("deepMerge", () => {
  it("should shallow merge flat objects", () => {
    const base = { a: 1, b: 2 };
    const override = { b: 3, c: 4 };

    const result = deepMerge(base, override);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("should deeply merge nested plain objects", () => {
    const base = {
      user: { name: "Alice", settings: { theme: "dark", notifications: true } },
    };
    const override = {
      user: { settings: { theme: "light" } },
    } as unknown as Partial<typeof base>;

    const result = deepMerge(base, override);

    expect(result).toEqual({
      user: {
        name: "Alice",
        settings: { theme: "light", notifications: true },
      },
    });
  });

  it("should overwrite arrays instead of merging them", () => {
    const base = { tags: ["js", "ts"], numbers: [1, 2] };
    const override = { tags: ["vitest"] };

    const result = deepMerge(base, override);

    expect(result).toEqual({ tags: ["vitest"], numbers: [1, 2] });
  });

  it("should treat null values as primitives and overwrite them", () => {
    const base = { data: { nested: "value" }, meta: null };
    const override = { data: null, meta: { id: 1 } } as unknown as Partial<
      typeof base
    >;

    const result = deepMerge(base, override);

    expect(result).toEqual({ data: null, meta: { id: 1 } });
  });

  it("should ignore undefined override values and retain base values", () => {
    const base = { a: 1, b: 2 };
    const override = { a: undefined, b: 5 };

    const result = deepMerge(base, override);

    expect(result).toEqual({ a: 1, b: 5 });
  });

  it("should not mutate the original base or override objects", () => {
    const base = { nested: { a: 1 } };
    const override = { nested: { b: 2 } } as unknown as Partial<typeof base>;

    const result = deepMerge(base, override);

    expect(result).not.toBe(base);
    expect(result.nested).not.toBe(base.nested);
    expect(base.nested).toEqual({ a: 1 });
    expect(override.nested).toEqual({ b: 2 });
  });
});
