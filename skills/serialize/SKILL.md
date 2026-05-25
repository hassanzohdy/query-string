---
name: mongez-query-string-serialize
description: How to serialize objects into URL query strings using queryString.toQueryString() and write them to the browser URL using queryString.update() — including array/nested syntax, null handling, and string passthrough.
when_to_use: User calls queryString.toQueryString() or queryString.update(), user is converting an object into a URL query string, user needs to write or update query parameters in the browser URL, user asks how @mongez/query-string handles arrays, nested objects, null, or percent-encoding during serialization.
---

# Serialize

`queryString.toQueryString(params)` turns an object back into a query string. `queryString.update(params)` does the same and writes the result to `window.location` via `history.replaceState`.

## Signatures

```ts
queryString.toQueryString(params: Record<string, any> | string): string
queryString.update(params: Record<string, any> | string): void
queryString.toString(): string   // window.location.search.substring(1)
```

## Basics

```ts
queryString.toQueryString({});                          // ""
queryString.toQueryString({ foo: "bar" });              // "foo=bar"
queryString.toQueryString({ a: 1, b: 2 });              // "a=1&b=2"
queryString.toQueryString({ count: 5 });                // "count=5"
```

Insertion order is preserved (Object.keys iterates string keys in insertion order for non-integer keys).

## Primitives

```ts
queryString.toQueryString({ on: true });                // "on=true"
queryString.toQueryString({ on: false });               // "on=false"
queryString.toQueryString({ v: undefined });            // "v=undefined"
queryString.toQueryString({ v: null });                 // ""   — quirk
```

`null` is dropped because `typeof null === "object"` routes it into the recursive branch and `{ ...null }` collapses to `{}`. Use `undefined` if you want the literal `"undefined"` to appear instead, or filter null entries out at the call site.

## Arrays — `key[]=value`

```ts
queryString.toQueryString({ tags: [] });                // ""
queryString.toQueryString({ tags: ["a"] });             // "tags[]=a"
queryString.toQueryString({ tags: ["a", "b", "c"] });   // "tags[]=a&tags[]=b&tags[]=c"
queryString.toQueryString({ ids: [1, 2, 3] });          // "ids[]=1&ids[]=2&ids[]=3"
```

An empty array drops the key entirely (the inner `.map(...).join("&")` produces `""`).

## Nested objects — `parent[child]=value`

```ts
queryString.toQueryString({ user: { name: "alice" } });
// "user[name]=alice"

queryString.toQueryString({ user: { name: "alice", age: 30 } });
// "user[name]=alice&user[age]=30"

queryString.toQueryString({ a: { b: { c: 1 } } });
// "a[b][c]=1"
```

## String passthrough

If you already hold a query string, hand it through unchanged:

```ts
queryString.toQueryString("already=encoded");           // "already=encoded"
queryString.toQueryString("");                          // ""
```

This is what makes `queryString.update("foo=bar")` work — the string short-circuits the serializer.

## No percent-encoding

`toQueryString` does NOT call `encodeURIComponent` on values. Strings containing `&` or `=` produce ambiguous output:

```ts
queryString.toQueryString({ q: "a&b" });                // "q=a&b"   — looks like two keys
queryString.toQueryString({ q: "hello world" });        // "q=hello world"   — literal space
```

If your values may contain reserved characters, pre-encode at the call site:

```ts
queryString.toQueryString({ q: encodeURIComponent("a&b") });   // "q=a%26b"
```

This is a documented quirk — see CHANGELOG.

## update — write to the URL

```ts
queryString.update({ tag: "books", page: 3 });
// URL becomes /products?tag=books&page=3

queryString.update("page=4");
// URL becomes /products?page=4

queryString.update({});
// URL becomes /products   — empty object clears the query
```

Calls `window.history.replaceState({}, "", url)`. Consequences:

- No new history entry is pushed — back-button keeps working as before.
- No `popstate` event fires.
- No reload, no fetch of the page.
- The pathname is preserved; only the search string changes.

For a navigation that DOES push history, use `history.pushState` directly:

```ts
const qs = queryString.toQueryString({ page: 3 });
history.pushState({}, "", `${location.pathname}?${qs}`);
```

## toString — read the URL

```ts
queryString.toString();      // "tag=books&page=2"   — current ?... without the "?"
```

Returns `""` if there's no query string. Cheap call.

## Round-tripping

For values containing only safe characters, parse and serialize are inverses (modulo numeric coercion):

```ts
const obj  = { tag: "books", page: 2, ids: [1, 2, 3] };
const text = queryString.toQueryString(obj);             // "tag=books&page=2&ids[]=1&ids[]=2&ids[]=3"
queryString.parse(text);                                  // structurally equal to `obj`
```

Numeric-looking strings come back as numbers — `{ n: "42" }` serializes to `"n=42"` which parses to `{ n: 42 }`. That asymmetry is intentional: the URL format is ambiguous, the parser picks the most useful type.

## Related skill cards

- [`parse.md`](./parse.md) for the inverse direction.
- [`recipes.md`](./recipes.md) for end-to-end flows.
