# @mongez/query-string

> Tiny query-string parse/serialize with nested-object and array support, plus a browser helper for reading and replacing the current URL.

`@mongez/query-string` is the parse/serialize half of every URL-driven feature — filters, sorts, pagination, search forms — packaged as one default-export object. Pass it an object, get back a query string with `[]` array brackets and `[parent][child]` nesting. Pass it a query string, get back an object with the same shape, plus automatic numeric coercion.

The four browser-bound methods (`all`, `get`, `update`, `toString`) read and write `window.location`, so you can drive the URL straight from a filter handler:

```ts
queryString.update({ tag: "books", sort: "price-asc", page: 2 });
// → window.location.search becomes "?tag=books&sort=price-asc&page=2"
```

There are no runtime dependencies.

## Install

```sh
yarn add @mongez/query-string
```

## A 30-second tour

```ts
import queryString from "@mongez/query-string";

// 1. Parse a query string into a typed object.
queryString.parse("?page=2&tags[]=a&tags[]=b&user[name]=alice");
// → { page: 2, tags: ["a", "b"], user: { name: "alice" } }

// 2. Serialize an object back into a query string.
queryString.toQueryString({ page: 2, tags: ["a", "b"] });
// → "page=2&tags[]=a&tags[]=b"

// 3. Read the current URL's query string.
queryString.all();                  // window.location.search → object
queryString.get("page", 1);         // single key with default
queryString.toString();             // search string without leading "?"

// 4. Replace the current URL's query string without a page reload.
queryString.update({ page: 3 });    // history.replaceState
```

## What's in the box

| Method | Purpose |
|---|---|
| `queryString.parse(searchParams)` | Parse the given string. Returns `{}` for empty input. |
| `queryString.all(searchParams?)` | Same as `parse`, but defaults to `window.location.search`. |
| `queryString.get(key, defaultValue?)` | Read one key from the current URL. Falls back to `defaultValue` (default: `null`). |
| `queryString.toString()` | Current `window.location.search` minus the leading `?`. |
| `queryString.toQueryString(params)` | Serialize an object (or pass through a string) to a query string. |
| `queryString.update(params)` | Replace the URL's query string via `history.replaceState`. Accepts an object or a pre-built string. |

There's a single default export — destructure off it if you prefer:

```ts
const { parse, toQueryString, get } = queryString;
```

## Parsing

```ts
queryString.parse("foo=bar");                       // { foo: "bar" }
queryString.parse("?foo=bar");                      // { foo: "bar" }
queryString.parse("a=1&b=2");                       // { a: 1, b: 2 }
queryString.parse("");                              // {}
queryString.parse("?");                             // {}
```

### Numeric coercion

Values that look like numbers come back as numbers, not strings:

```ts
queryString.parse("age=42");                        // { age: 42 }
queryString.parse("pi=3.14");                       // { pi: 3.14 }
queryString.parse("neg=-5");                        // { neg: -5 }
queryString.parse("zip=007");                       // { zip: 7 }
```

The check is `!isNaN(value - parseFloat(value))`, so leading zeros collapse and only strict numeric forms coerce. Strings like `"NaN"`, `"Infinity"`, `"true"`, `"false"` stay as strings.

If you need to preserve `"007"` literally — phone numbers, zip codes, version strings — quote them server-side as you would for any URL-encoded transport.

### URL decoding

Non-numeric values are passed through `decodeURIComponent`:

```ts
queryString.parse("greeting=hello%20world");        // { greeting: "hello world" }
queryString.parse("path=%2Fhome%2Fuser");           // { path: "/home/user" }
```

`+` is NOT translated to a space — `decodeURIComponent("a+b")` is `"a+b"`. If your producer uses `+` for spaces, pre-process: `s.replace(/\+/g, "%20")` before parsing.

### Arrays — `key[]=value`

A key suffixed with `[]` becomes an array. Repeat the key to add elements:

```ts
queryString.parse("tags[]=a&tags[]=b&tags[]=c");
// → { tags: ["a", "b", "c"] }

queryString.parse("ids[]=1&ids[]=2");
// → { ids: [1, 2] }   (each element gets numeric-coerced individually)
```

### Nested objects — `parent[child]=value`

Bracket syntax expresses arbitrary-depth nesting:

```ts
queryString.parse("user[name]=alice&user[age]=30");
// → { user: { name: "alice", age: 30 } }

queryString.parse("a[b][c]=1");
// → { a: { b: { c: 1 } } }
```

## Serializing

```ts
queryString.toQueryString({ foo: "bar" });                  // "foo=bar"
queryString.toQueryString({ a: 1, b: 2 });                  // "a=1&b=2"
queryString.toQueryString({});                              // ""

queryString.toQueryString({ tags: ["a", "b"] });            // "tags[]=a&tags[]=b"
queryString.toQueryString({ user: { name: "alice" } });     // "user[name]=alice"
queryString.toQueryString({ a: { b: { c: 1 } } });          // "a[b][c]=1"
```

### Strings pass through

If you already hold a query string, `toQueryString` returns it unchanged:

```ts
queryString.toQueryString("foo=bar&n=5");                   // "foo=bar&n=5"
```

This is what makes `queryString.update("foo=bar")` work — the string short-circuits the serializer.

### Round-tripping is safe for safe characters

```ts
const obj  = { tag: "books", page: 2, ids: [1, 2, 3] };
const text = queryString.toQueryString(obj);
queryString.parse(text);  // structurally equal to `obj`
```

Numeric-looking strings coerce on the way back (`{ n: "42" }` → `n=42` → `{ n: 42 }`). That asymmetry is intentional: the storage format is ambiguous, the parser picks the most useful type.

### Quirks

A few corners have known bugs — they're tested as `.skip()` so a future fix has a regression target:

- **No percent-encoding on output.** Values containing `&` or `=` produce ambiguous output (`{ q: "a&b" }` serializes as `q=a&b`, which the parser then reads as two keys). Either avoid the reserved characters or pre-encode the value yourself.
- **`null` values drop the key.** `typeof null === "object"` routes `null` into the recursive branch, and `{ ...null }` is `{}`, so the entry vanishes. Use `undefined` if you want the placeholder `"undefined"` to appear instead.

See `CHANGELOG.md` for the full list of documented quirks and the file:line where each lives.

## Browser methods

These four require `window` / `document` — they're meant for client-side use.

### `queryString.all(searchParams?)`

Same as `parse`, but `searchParams` defaults to `window.location.search`. Convenient when you just want the current URL parsed:

```ts
// On URL: /products?tag=books&page=2
queryString.all();          // { tag: "books", page: 2 }
queryString.all("?x=1");    // { x: 1 }   — explicit argument wins
```

### `queryString.get(key, defaultValue?)`

Reads one key from `queryString.all()`:

```ts
// On URL: /products?page=2
queryString.get("page");                // 2
queryString.get("missing");             // null  (default default)
queryString.get("missing", 1);          // 1
queryString.get("missing", { x: 1 });   // { x: 1 }
```

The fallback uses `||`, so falsy values (`0`, `""`, `false`-like) also fall through to the default. For a strict "is this key present" check, use `queryString.all()` and look the key up yourself.

### `queryString.toString()`

Current `window.location.search` with the leading `?` stripped:

```ts
// On URL: /products?tag=books&page=2
queryString.toString();      // "tag=books&page=2"
```

Returns `""` when there's no query string.

### `queryString.update(params)`

Replaces the URL's query via `history.replaceState`, keeping the pathname:

```ts
queryString.update({ tag: "books", page: 3 });
// URL becomes /products?tag=books&page=3 — no reload, no history entry pushed

queryString.update("page=3&sort=asc");
// URL becomes /products?page=3&sort=asc

queryString.update({});
// URL becomes /products   — empty object clears the query
```

For a navigation that creates a history entry, use `history.pushState` directly with the result of `queryString.toQueryString(params)`.

## Patterns

### URL-driven filters

```ts
import queryString from "@mongez/query-string";

type Filters = { tag?: string; sort?: string; page?: number };

function readFilters(): Filters {
  return queryString.all() as Filters;
}

function writeFilters(f: Filters) {
  queryString.update(f as Record<string, any>);
}

// User clicks a tag:
const current = readFilters();
writeFilters({ ...current, tag: "books", page: 1 });
```

### Sync with a router's `popstate`

`update` calls `replaceState`, which does NOT fire `popstate`. If you mirror filter state into another store, subscribe to your store rather than the browser history.

### Pagination

```ts
const page = queryString.get("page", 1) as number;
queryString.update({ ...queryString.all(), page: page + 1 });
```

## Imports

```ts
import queryString from "@mongez/query-string";
```

The internal parsers are also exported, in case you want to bypass the facade:

```ts
import { toObjectParser, toStringParser } from "@mongez/query-string/src/query-string-parsers";
// Returns the same shapes as `queryString.parse` / `queryString.toQueryString`.
```

These are not part of the stable surface — the default export is.

## Related packages

| Package | Purpose |
|---|---|
| [`@mongez/concat-route`](https://github.com/hassanzohdy/concat-route) | URL / path helpers — join, normalize, slugify. |
| [`@mongez/react-router`](https://github.com/hassanzohdy/mongez-react-router) | Router primitives that pair well with query-string-driven filters. |
| [`@mongez/cache`](https://github.com/hassanzohdy/mongez-cache) | Browser cache adapters (localStorage / sessionStorage / cookies). |

## License

MIT
