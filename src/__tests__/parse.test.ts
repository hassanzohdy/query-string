import { describe, expect, it } from "vitest";
import queryString from "../index";

describe("queryString.parse", () => {
  describe("basics", () => {
    it("returns {} for an empty string", () => {
      expect(queryString.parse("")).toEqual({});
    });

    it("returns {} for just a question mark", () => {
      expect(queryString.parse("?")).toEqual({});
    });

    it("strips a leading question mark", () => {
      expect(queryString.parse("?foo=bar")).toEqual({ foo: "bar" });
    });

    it("parses a single key/value pair without a leading question mark", () => {
      expect(queryString.parse("foo=bar")).toEqual({ foo: "bar" });
    });

    it("parses multiple key/value pairs", () => {
      expect(queryString.parse("foo=bar&baz=qux")).toEqual({
        foo: "bar",
        baz: "qux",
      });
    });

    it("overwrites duplicate non-array keys with the last occurrence", () => {
      expect(queryString.parse("foo=one&foo=two")).toEqual({ foo: "two" });
    });
  });

  describe("type coercion", () => {
    it("coerces integer-looking values to numbers", () => {
      expect(queryString.parse("age=42")).toEqual({ age: 42 });
      expect(typeof (queryString.parse("age=42") as any).age).toBe("number");
    });

    it("coerces floats to numbers", () => {
      expect(queryString.parse("pi=3.14")).toEqual({ pi: 3.14 });
    });

    it("coerces zero", () => {
      expect(queryString.parse("n=0")).toEqual({ n: 0 });
    });

    it("coerces negative numbers", () => {
      expect(queryString.parse("n=-5")).toEqual({ n: -5 });
    });

    it("leaves non-numeric strings as strings", () => {
      expect(queryString.parse("foo=hello")).toEqual({ foo: "hello" });
    });

    it("leaves the literal string 'NaN' as a string", () => {
      expect(queryString.parse("x=NaN")).toEqual({ x: "NaN" });
    });

    it("leaves the literal string 'Infinity' as a string", () => {
      expect(queryString.parse("x=Infinity")).toEqual({ x: "Infinity" });
    });

    it("does NOT coerce 'true' / 'false' to booleans", () => {
      const parsed = queryString.parse("a=true&b=false") as any;
      expect(parsed.a).toBe("true");
      expect(parsed.b).toBe("false");
    });

    it("collapses leading zeros via Number() coercion ('007' → 7)", () => {
      expect(queryString.parse("zip=007")).toEqual({ zip: 7 });
    });
  });

  describe("URL decoding", () => {
    it("decodes percent-encoded spaces in non-numeric values", () => {
      expect(queryString.parse("greeting=hello%20world")).toEqual({
        greeting: "hello world",
      });
    });

    it("decodes percent-encoded special characters", () => {
      expect(queryString.parse("path=%2Fhome%2Fuser")).toEqual({
        path: "/home/user",
      });
    });

    it("decodes plus-prefixed encodings via decodeURIComponent semantics", () => {
      // decodeURIComponent treats "+" as a literal "+" (not a space).
      // This documents the actual behavior — callers expecting `+` → ` `
      // need to pre-process or use a different library.
      expect(queryString.parse("q=a+b")).toEqual({ q: "a+b" });
    });
  });

  describe("arrays via '[]'", () => {
    it("parses a single-element array", () => {
      expect(queryString.parse("tags[]=a")).toEqual({ tags: ["a"] });
    });

    it("parses a multi-element array", () => {
      expect(queryString.parse("tags[]=a&tags[]=b&tags[]=c")).toEqual({
        tags: ["a", "b", "c"],
      });
    });

    it("coerces numeric array elements to numbers", () => {
      expect(queryString.parse("ids[]=1&ids[]=2&ids[]=3")).toEqual({
        ids: [1, 2, 3],
      });
    });

    it("mixes string and number elements based on each value", () => {
      expect(queryString.parse("vals[]=1&vals[]=two&vals[]=3")).toEqual({
        vals: [1, "two", 3],
      });
    });
  });

  describe("nested objects via 'key[sub]'", () => {
    it("parses a single nested property", () => {
      expect(queryString.parse("user[name]=alice")).toEqual({
        user: { name: "alice" },
      });
    });

    it("parses multiple keys under the same parent", () => {
      expect(queryString.parse("user[name]=alice&user[age]=30")).toEqual({
        user: { name: "alice", age: 30 },
      });
    });

    it("parses two unrelated parents in one string", () => {
      expect(
        queryString.parse("user[name]=alice&meta[role]=admin"),
      ).toEqual({
        user: { name: "alice" },
        meta: { role: "admin" },
      });
    });

    it("parses deeply nested objects", () => {
      expect(queryString.parse("a[b][c]=1")).toEqual({ a: { b: { c: 1 } } });
    });
  });

  describe("error / quirky inputs", () => {
    it("throws on a non-string searchParams argument", () => {
      // `searchParams.startsWith(...)` will throw a TypeError.
      expect(() => (queryString.parse as any)(undefined)).toThrow();
    });

    // The parser's split-by-`=` strategy assumes every pair has exactly
    // one `=`. Without one, `pair[1]` is `undefined`. Fixed at
    // `src/query-string-parsers.ts:14` to emit an empty string value.
    it("key without '=' produces an empty string value", () => {
      expect(queryString.parse("foo")).toEqual({ foo: "" });
    });
  });

  describe("prototype pollution guards", () => {
    it("does not pollute Object.prototype via '__proto__[x]=y'", () => {
      queryString.parse("__proto__[x]=y");
      expect(({} as any).x).toBeUndefined();
    });

    it("does not pollute Object.prototype via 'constructor[prototype][x]=y'", () => {
      queryString.parse("constructor[prototype][x]=y");
      expect(({} as any).x).toBeUndefined();
    });

    it("does not pollute Object.prototype via '__proto__.x=y'", () => {
      queryString.parse("__proto__.x=y");
      expect(({} as any).x).toBeUndefined();
    });

    it("does not pollute Object.prototype via nested 'a[__proto__][x]=y'", () => {
      queryString.parse("a[__proto__][x]=y");
      expect(({} as any).x).toBeUndefined();
    });

    it("skips forbidden segments instead of throwing, and still parses siblings", () => {
      expect(
        queryString.parse("__proto__[x]=y&safe=1"),
      ).toEqual({ safe: 1 });
    });

    it("still parses legitimate nested objects correctly", () => {
      expect(queryString.parse("a[b][c]=1")).toEqual({ a: { b: { c: 1 } } });
      expect(
        queryString.parse("user[name]=alice&user[age]=30"),
      ).toEqual({ user: { name: "alice", age: 30 } });
    });
  });
});
