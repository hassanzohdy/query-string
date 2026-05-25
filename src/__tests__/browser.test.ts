import { beforeEach, describe, expect, it } from "vitest";
import queryString from "../index";

/**
 * happy-dom exposes a writable `window.location` and a working
 * `window.history.replaceState`, so the browser-bound methods can be
 * exercised by mutating the URL in `beforeEach`. The target URL must
 * share the document's origin or `replaceState` throws SecurityError —
 * read the current origin off `window.location` at call time.
 */
function setLocation(pathname: string, search: string) {
  const origin = window.location.origin;
  window.history.replaceState({}, "", `${origin}${pathname}${search}`);
}

describe("queryString.all", () => {
  beforeEach(() => {
    setLocation("/", "");
  });

  it("returns {} when the URL has no query string", () => {
    expect(queryString.all()).toEqual({});
  });

  it("reads window.location.search by default", () => {
    setLocation("/", "?foo=bar");
    expect(queryString.all()).toEqual({ foo: "bar" });
  });

  it("accepts an explicit query string argument", () => {
    setLocation("/", "?ignored=1");
    expect(queryString.all("?foo=bar")).toEqual({ foo: "bar" });
  });

  it("strips a leading question mark from the explicit argument", () => {
    expect(queryString.all("?a=1&b=2")).toEqual({ a: 1, b: 2 });
  });

  it("returns {} for an explicitly empty string", () => {
    expect(queryString.all("")).toEqual({});
  });

  it("returns {} for just a question mark", () => {
    expect(queryString.all("?")).toEqual({});
  });

  it("parses nested keys from the live URL", () => {
    setLocation("/", "?user[name]=alice&user[age]=30");
    expect(queryString.all()).toEqual({
      user: { name: "alice", age: 30 },
    });
  });
});

describe("queryString.get", () => {
  beforeEach(() => {
    setLocation("/", "?foo=bar&n=5&flag=true");
  });

  it("returns the parsed value for a present key", () => {
    expect(queryString.get("foo")).toBe("bar");
  });

  it("returns a numeric-coerced value for a numeric key", () => {
    expect(queryString.get("n")).toBe(5);
  });

  it("returns null when the key is missing and no default is given", () => {
    expect(queryString.get("missing")).toBeNull();
  });

  it("returns the given default when the key is missing", () => {
    expect(queryString.get("missing", "fallback")).toBe("fallback");
  });

  it("accepts any default-value type", () => {
    expect(queryString.get("missing", 42)).toBe(42);
    expect(queryString.get("missing", { x: 1 })).toEqual({ x: 1 });
  });

  it("returns the default for falsy values too (truthy-check semantics)", () => {
    // `all[key] || defaultValue` — documented quirk: 0, "" and false-ish
    // values fall through to the default. Callers who need a strict
    // present/absent check should use `all()` directly.
    setLocation("/", "?zero=0&empty=");
    expect(queryString.get("zero", "fallback")).toBe("fallback");
    expect(queryString.get("empty", "fallback")).toBe("fallback");
  });
});

describe("queryString.toString", () => {
  beforeEach(() => {
    setLocation("/", "");
  });

  it("returns an empty string when there is no query", () => {
    expect(queryString.toString()).toBe("");
  });

  it("returns the search string without the leading question mark", () => {
    setLocation("/", "?foo=bar&baz=1");
    expect(queryString.toString()).toBe("foo=bar&baz=1");
  });
});

describe("queryString.update", () => {
  beforeEach(() => {
    setLocation("/some/path", "?old=true");
  });

  it("replaces the search string when given an object", () => {
    queryString.update({ a: 1, b: "two" });
    expect(window.location.search).toBe("?a=1&b=two");
  });

  it("keeps the existing pathname", () => {
    queryString.update({ a: 1 });
    expect(window.location.pathname).toBe("/some/path");
  });

  it("clears the search string when given an empty object", () => {
    queryString.update({});
    expect(window.location.search).toBe("");
  });

  it("accepts a string argument and uses it verbatim", () => {
    queryString.update("foo=bar&n=5");
    expect(window.location.search).toBe("?foo=bar&n=5");
  });

  it("clears the search string when given an empty string", () => {
    queryString.update("");
    expect(window.location.search).toBe("");
  });

  it("serializes nested objects with [parent][child] syntax", () => {
    queryString.update({ user: { name: "alice" } });
    expect(window.location.search).toBe("?user[name]=alice");
  });

  it("serializes arrays with [] suffix", () => {
    queryString.update({ tags: ["a", "b"] });
    expect(window.location.search).toBe("?tags[]=a&tags[]=b");
  });
});
