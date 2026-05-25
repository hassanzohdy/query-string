import { describe, expect, it } from "vitest";
import queryString from "../index";

describe("queryString.toQueryString", () => {
  describe("basics", () => {
    it("returns an empty string for an empty object", () => {
      expect(queryString.toQueryString({})).toBe("");
    });

    it("serializes a single string pair", () => {
      expect(queryString.toQueryString({ foo: "bar" })).toBe("foo=bar");
    });

    it("serializes a single number pair", () => {
      expect(queryString.toQueryString({ count: 5 })).toBe("count=5");
    });

    it("serializes multiple pairs joined with '&'", () => {
      expect(queryString.toQueryString({ foo: "bar", baz: 1 })).toBe(
        "foo=bar&baz=1",
      );
    });

    it("preserves key insertion order", () => {
      // Object.keys iterates string keys in insertion order for non-integer
      // keys, so the output order matches the literal order below.
      const out = queryString.toQueryString({ z: 1, a: 2, m: 3 });
      expect(out).toBe("z=1&a=2&m=3");
    });
  });

  describe("primitives", () => {
    it("stringifies booleans via implicit toString()", () => {
      expect(queryString.toQueryString({ on: true })).toBe("on=true");
      expect(queryString.toQueryString({ on: false })).toBe("on=false");
    });

    it("serializes null as the literal 'null'", () => {
      // The serializer used to treat `null` as an object (typeof null === "object")
      // and recurse into it, causing the key to vanish. Fixed at
      // `src/query-string-parsers.ts:55` to emit `key=null`.
      expect(queryString.toQueryString({ v: null })).toBe("v=null");
    });

    it("stringifies undefined as the string 'undefined'", () => {
      expect(queryString.toQueryString({ v: undefined })).toBe("v=undefined");
    });
  });

  describe("arrays via '[]='", () => {
    it("serializes an empty array as an empty string", () => {
      // An empty `value.map(...)` returns an empty array; `.join("&")`
      // yields `""`, so the key drops out entirely.
      expect(queryString.toQueryString({ tags: [] })).toBe("");
    });

    it("serializes a one-element array", () => {
      expect(queryString.toQueryString({ tags: ["a"] })).toBe("tags[]=a");
    });

    it("serializes a multi-element array", () => {
      expect(queryString.toQueryString({ tags: ["a", "b", "c"] })).toBe(
        "tags[]=a&tags[]=b&tags[]=c",
      );
    });

    it("serializes numeric arrays without quoting", () => {
      expect(queryString.toQueryString({ ids: [1, 2, 3] })).toBe(
        "ids[]=1&ids[]=2&ids[]=3",
      );
    });
  });

  describe("nested objects via 'parent[child]='", () => {
    it("serializes one nested property", () => {
      expect(queryString.toQueryString({ user: { name: "alice" } })).toBe(
        "user[name]=alice",
      );
    });

    it("serializes multiple keys under the same parent", () => {
      expect(
        queryString.toQueryString({ user: { name: "alice", age: 30 } }),
      ).toBe("user[name]=alice&user[age]=30");
    });

    it("serializes deeply nested objects", () => {
      expect(queryString.toQueryString({ a: { b: { c: 1 } } })).toBe(
        "a[b][c]=1",
      );
    });
  });

  describe("string passthrough", () => {
    it("returns a string argument unchanged", () => {
      // `toQueryString` short-circuits when `params` is a string —
      // documented behavior for callers that already have one.
      expect(queryString.toQueryString("already=encoded")).toBe(
        "already=encoded",
      );
    });

    it("returns an empty string when passed an empty string", () => {
      expect(queryString.toQueryString("")).toBe("");
    });
  });

  describe("percent-encoding", () => {
    // `toStringParser` now percent-encodes values so round-tripping
    // through `parse` works for values that include reserved characters.
    it("percent-encodes values containing '&' — src/query-string-parsers.ts:55-60", () => {
      expect(queryString.toQueryString({ q: "a&b" })).toBe("q=a%26b");
    });

    it("percent-encodes values containing '=' — src/query-string-parsers.ts:55-60", () => {
      expect(queryString.toQueryString({ q: "a=b" })).toBe("q=a%3Db");
    });

    it("percent-encodes spaces in values — src/query-string-parsers.ts:55-60", () => {
      expect(queryString.toQueryString({ q: "hello world" })).toBe(
        "q=hello%20world",
      );
    });

    it("serializes null as the literal 'null' — src/query-string-parsers.ts:55", () => {
      expect(queryString.toQueryString({ v: null })).toBe("v=null");
    });
  });
});

describe("round-trip: toQueryString ∘ parse", () => {
  it("preserves a flat object with safe characters", () => {
    const obj = { foo: "bar", count: 5 };
    const text = queryString.toQueryString(obj);
    expect(queryString.parse(text)).toEqual(obj);
  });

  it("preserves an array with safe characters", () => {
    const obj = { tags: ["a", "b", "c"] };
    const text = queryString.toQueryString(obj);
    expect(queryString.parse(text)).toEqual(obj);
  });

  it("preserves nested objects with safe characters", () => {
    const obj = { user: { name: "alice", age: 30 } };
    const text = queryString.toQueryString(obj);
    expect(queryString.parse(text)).toEqual(obj);
  });

  it("coerces numeric-looking strings on the way back", () => {
    // The serializer writes `n=42` as a string; the parser sees a numeric
    // value and coerces it. Asymmetry by design.
    const text = queryString.toQueryString({ n: "42" });
    expect(queryString.parse(text)).toEqual({ n: 42 });
  });
});
