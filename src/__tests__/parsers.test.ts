import { describe, expect, it } from "vitest";
import { toObjectParser, toStringParser } from "../query-string-parsers";

/**
 * The two pure parser functions are also exercised through the higher-level
 * `queryString` facade in `parse.test.ts` / `serialize.test.ts`. These tests
 * just pin down behaviour at the lower level so a future refactor that
 * keeps `parse` / `toQueryString` working but breaks the helpers is still
 * caught.
 */

describe("toObjectParser", () => {
  it("parses a single key/value pair", () => {
    expect(toObjectParser("foo=bar")).toEqual({ foo: "bar" });
  });

  it("parses multiple pairs", () => {
    expect(toObjectParser("a=1&b=2")).toEqual({ a: 1, b: 2 });
  });

  it("coerces numeric values to numbers", () => {
    expect(toObjectParser("n=42")).toEqual({ n: 42 });
  });

  it("decodes percent-encoded non-numeric values", () => {
    expect(toObjectParser("q=hello%20world")).toEqual({ q: "hello world" });
  });

  it("builds arrays from keys with the '[]' suffix", () => {
    expect(toObjectParser("tags[]=a&tags[]=b")).toEqual({ tags: ["a", "b"] });
  });

  it("builds nested objects from bracket-key syntax", () => {
    expect(toObjectParser("user[name]=alice&user[age]=30")).toEqual({
      user: { name: "alice", age: 30 },
    });
  });

  it("supports deep nesting", () => {
    expect(toObjectParser("a[b][c]=1")).toEqual({ a: { b: { c: 1 } } });
  });

  it("last-write-wins for duplicate non-array keys", () => {
    expect(toObjectParser("k=one&k=two")).toEqual({ k: "two" });
  });
});

describe("toStringParser", () => {
  it("returns an empty string for an empty object", () => {
    expect(toStringParser({})).toBe("");
  });

  it("serializes a single key/value", () => {
    expect(toStringParser({ foo: "bar" })).toBe("foo=bar");
  });

  it("joins multiple keys with '&'", () => {
    expect(toStringParser({ a: 1, b: 2 })).toBe("a=1&b=2");
  });

  it("emits '[]=' for array values", () => {
    expect(toStringParser({ tags: ["a", "b"] })).toBe("tags[]=a&tags[]=b");
  });

  it("recurses into nested objects with bracket syntax", () => {
    expect(toStringParser({ user: { name: "alice" } })).toBe(
      "user[name]=alice",
    );
  });

  it("supports the parentKey argument for prefixed serialization", () => {
    expect(toStringParser({ name: "alice", age: 30 }, "user")).toBe(
      "user[name]=alice&user[age]=30",
    );
  });

  it("emits 'undefined' for undefined and 'null' for null", () => {
    // `undefined` is stringified via `encodeURIComponent` (which yields the
    // literal "undefined"); `null` is short-circuited to emit `key=null`.
    expect(toStringParser({ a: undefined, b: null })).toBe("a=undefined&b=null");
  });
});
