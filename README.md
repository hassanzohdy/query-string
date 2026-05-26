<div align="center">

# @mongez/query-string

**Tiny query-string parse/serialize with nested objects, `[]` arrays, numeric coercion, and browser helpers for `window.location` — one default export, zero dependencies.**

[![npm](https://img.shields.io/npm/v/@mongez/query-string.svg)](https://www.npmjs.com/package/@mongez/query-string)
[![license](https://img.shields.io/npm/l/@mongez/query-string.svg)](LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mongez/query-string.svg)](https://bundlephobia.com/package/@mongez/query-string)
[![downloads](https://img.shields.io/npm/dw/@mongez/query-string.svg)](https://www.npmjs.com/package/@mongez/query-string)

</div>

---

## Why @mongez/query-string?

Native `URLSearchParams` is verbose, string-only on output, and has no concept of nested objects or `[]` arrays — every filter handler ends up wrapping it in helpers. `qs` (npm) does nesting but ships ~10kB and uses different bracket semantics. `query-string` (npm) is close in spirit but flattens arrays by repeated keys (`tag=a&tag=b`) rather than the `[]` convention most server frameworks expect. `@mongez/query-string` is the smallest layer that does the four things a filter URL actually needs: parse, serialize, read the current URL, and rewrite it without a reload — with `tags[]=a&tags[]=b` arrays, `user[name]=alice` nesting, and `"42"` → `42` numeric coercion baked in.

```ts
import queryString from "@mongez/query-string";

queryString.parse("?page=2&tags[]=a&tags[]=b&user[name]=alice");
// → { page: 2, tags: ["a", "b"], user: { name: "alice" } }

queryString.toQueryString({ page: 2, tags: ["a", "b"] });
// → "page=2&tags[]=a&tags[]=b"

queryString.update({ tag: "books", page: 1 });
// window.location.search becomes "?tag=books&page=1" — no reload
```

---

## Features

| Feature | Description |
|---|---|
| **Numeric coercion** | `"42"` parses to `42`, `"3.14"` to `3.14`, `"-5"` to `-5`. Strict numeric forms only — `"true"`, `"NaN"`, `"Infinity"` stay as strings. |
| **`[]` arrays** | `tags[]=a&tags[]=b` parses to `{ tags: ["a", "b"] }`; the serializer emits the same shape from `{ tags: [...] }`. |
| **Bracket nesting** | `user[name]=alice&user[age]=30` ⇄ `{ user: { name: "alice", age: 30 } }`. Any depth supported. |
| **Percent-encoded output** | Values containing `&`, `=`, spaces, and other reserved characters are encoded via `encodeURIComponent` on serialize. |
| **`null` round-trips** | `{ v: null }` serializes as `v=null` (no key drop) — pair with a parser-side decoder if you need to recover the value. |
| **Browser helpers** | `all` / `get` / `toString` / `update` read and rewrite `window.location.search` via `history.replaceState`. |
| **Default-export object** | One import, no named-export juggling. Destructure if you prefer. |
| **Zero dependencies** | No runtime or peer deps. One source file plus a parser module. |

---

## Installation

```sh
npm install @mongez/query-string
```

```sh
yarn add @mongez/query-string
```

```sh
pnpm add @mongez/query-string
```

---

## Quick start

```ts
import queryString from "@mongez/query-string";

// 1. Parse a query string into a typed object.
queryString.parse("?page=2&tags[]=a&tags[]=b&user[name]=alice");
// → { page: 2, tags: ["a", "b"], user: { name: "alice" } }

// 2. Serialize an object back into a query string.
queryString.toQueryString({ page: 2, tags: ["a", "b"] });
// → "page=2&tags[]=a&tags[]=b"

// 3. Read from the current URL (browser only).
queryString.all();             // window.location.search → object
queryString.get("page", 1);    // single key with fallback
queryString.toString();        // search string without leading "?"

// 4. Write to the current URL without a page reload (browser only).
queryString.update({ page: 3 });
```

Every method is reachable off the default export. Destructure if you like:

```ts
const { parse, toQueryString, get, update } = queryString;
```

> **Browser vs anywhere.** `parse` and `toQueryString` are pure data functions — they run in Node, workers, or any non-browser runtime. `all` / `get` / `toString` / `update` reference `window.location` and `window.history` and will throw outside the browser. Guard with `typeof window !== "undefined"` if the same module loads on both sides.

---

## Parsing — `queryString.parse(text)` and `queryString.all(text?)`

`parse` accepts any string (with or without a leading `?`) and returns a `Record<string, any>`. `all` is the same function but defaults to `window.location.search` when called with no argument.

```ts
queryString.parse("foo=bar");        // { foo: "bar" }
queryString.parse("?foo=bar");       // { foo: "bar" }   — leading "?" stripped
queryString.parse("a=1&b=2");        // { a: 1, b: 2 }
queryString.parse("");               // {}
queryString.parse("?");              // {}
```

### Numeric coercion

Values matching `!isNaN(v - parseFloat(v))` become numbers; everything else stays a string:

```ts
queryString.parse("age=42");         // { age: 42 }
queryString.parse("pi=3.14");        // { pi: 3.14 }
queryString.parse("neg=-5");         // { neg: -5 }
queryString.parse("zip=007");        // { zip: 7 }       — leading zeros collapse via Number()
queryString.parse("x=NaN");          // { x: "NaN" }     — literal string
queryString.parse("a=true");         // { a: "true" }    — booleans NOT coerced
```

> **Preserve number-as-string transports under a different shape.** If `"007"` matters (zip codes, version strings), keep them under a key the consumer parses specially (`zip-007`) or store them server-side as quoted JSON in a single value.

### URL decoding

Non-numeric values pass through `decodeURIComponent`:

```ts
queryString.parse("greeting=hello%20world");   // { greeting: "hello world" }
queryString.parse("path=%2Fhome%2Fuser");      // { path: "/home/user" }
queryString.parse("q=a+b");                    // { q: "a+b" }   — "+" is literal, NOT a space
```

### Arrays — `key[]=value`

A key suffixed with `[]` collects repeated occurrences into an array. Each element is numeric-coerced individually:

```ts
queryString.parse("tags[]=a&tags[]=b&tags[]=c");   // { tags: ["a", "b", "c"] }
queryString.parse("ids[]=1&ids[]=2&ids[]=3");      // { ids: [1, 2, 3] }
queryString.parse("vals[]=1&vals[]=two&vals[]=3"); // { vals: [1, "two", 3] }
```

### Nested objects — `parent[child]=value`

Bracket syntax expresses arbitrary nesting depth:

```ts
queryString.parse("user[name]=alice&user[age]=30");
// → { user: { name: "alice", age: 30 } }

queryString.parse("a[b][c]=1");
// → { a: { b: { c: 1 } } }
```

### `queryString.get(key, defaultValue?)`

Reads one key from `queryString.all()` with a fallback:

```ts
// On URL: /products?page=2
queryString.get("page");              // 2
queryString.get("missing");           // null   (default default)
queryString.get("missing", 1);        // 1
queryString.get("missing", { x: 1 }); // { x: 1 }
```

> **`get` uses truthy semantics.** The fallback also fires for `0`, `""`, `false`, and `null` parsed values. For a strict "is this key present?" check, use `key in queryString.all()` instead.

---

## Serializing — `queryString.toQueryString(params)`

Pass an object — get a query string with `[]` arrays, `[parent][child]` nesting, and `encodeURIComponent`-escaped values. Pass a string — it's returned verbatim (which is what makes `queryString.update("foo=bar")` work).

```ts
queryString.toQueryString({ foo: "bar" });                // "foo=bar"
queryString.toQueryString({ a: 1, b: 2 });                // "a=1&b=2"
queryString.toQueryString({});                            // ""

queryString.toQueryString({ tags: ["a", "b"] });          // "tags[]=a&tags[]=b"
queryString.toQueryString({ user: { name: "alice" } });   // "user[name]=alice"
queryString.toQueryString({ a: { b: { c: 1 } } });        // "a[b][c]=1"

queryString.toQueryString("already=encoded");             // "already=encoded"   — strings pass through
```

### Percent-encoding

Values containing reserved characters are encoded so the round-trip back through `parse` is unambiguous:

```ts
queryString.toQueryString({ q: "a&b" });           // "q=a%26b"
queryString.toQueryString({ q: "a=b" });           // "q=a%3Db"
queryString.toQueryString({ q: "hello world" });   // "q=hello%20world"
```

### Primitives

```ts
queryString.toQueryString({ on: true });           // "on=true"
queryString.toQueryString({ on: false });          // "on=false"
queryString.toQueryString({ v: null });            // "v=null"        — emitted as the literal string
queryString.toQueryString({ v: undefined });       // "v=undefined"   — same
queryString.toQueryString({ tags: [] });           // ""              — empty array drops the key
```

> **`null` and `undefined` round-trip as strings, not values.** `parse` reads `"null"` and `"undefined"` back as those literal strings. If you need to distinguish "missing" from "explicitly null" in a URL-backed state, omit the key entirely for missing and pick a sentinel (`"__null__"`) for explicit null.

### Round-tripping

`parse(toQueryString(obj))` is structurally equal to `obj` for safe shapes — flat keys, nested objects, arrays of strings or numbers:

```ts
const obj = { tag: "books", page: 2, ids: [1, 2, 3] };
queryString.parse(queryString.toQueryString(obj));
// → { tag: "books", page: 2, ids: [1, 2, 3] }
```

Numeric-looking strings coerce on the way back — `{ n: "42" }` serializes as `n=42`, which parses to `{ n: 42 }`. The asymmetry is intentional: the URL is a stringly-typed transport; the parser picks the most useful type.

---

## Browser helpers

These four require `window` and `document` — client-side only.

### `queryString.all(searchParams?)`

Same as `parse`, but defaults to `window.location.search`:

```ts
// On URL: /products?tag=books&page=2
queryString.all();           // { tag: "books", page: 2 }
queryString.all("?x=1");     // { x: 1 }   — explicit argument wins
```

### `queryString.toString()`

Current `window.location.search` with the leading `?` stripped. Returns `""` when there's no query:

```ts
// On URL: /products?tag=books&page=2
queryString.toString();      // "tag=books&page=2"
```

### `queryString.update(params)`

Replaces the URL's query via `history.replaceState`, keeping the pathname intact. Accepts an object or a pre-built string. An empty object/string clears the query:

```ts
queryString.update({ tag: "books", page: 3 });
// URL becomes /products?tag=books&page=3 — no reload, no new history entry

queryString.update("page=3&sort=asc");     // verbatim
queryString.update({});                    // clears the query
```

> **`update` does NOT fire `popstate`.** `history.replaceState` is silent — listeners on `popstate` (browser routers, store subscribers) won't react. If you mirror URL state into another store, subscribe to your store rather than `popstate`. For a real history entry that does fire navigation, use `history.pushState` directly with `queryString.toQueryString(params)`.

---

## Recipes

### Build a paginated filter URL

The list-page classic — tag, sort, and page number all live in the URL so a refresh restores the view and the URL is shareable:

```ts
import queryString from "@mongez/query-string";

type Filters = {
  tag?: string;
  sort?: "price-asc" | "price-desc" | "newest";
  page?: number;
};

function readFilters(): Filters {
  return queryString.all() as Filters;
}

function writeFilters(next: Filters) {
  queryString.update(next as Record<string, any>);
}

// User picks a tag — reset to page 1 so the new filter starts fresh.
function applyTag(tag: string) {
  const current = readFilters();
  writeFilters({ ...current, tag, page: 1 });
}

// User clicks "next page".
function goToPage(n: number) {
  const current = readFilters();
  writeFilters({ ...current, page: n });
}
```

### Round-trip filters from URL to state and back

When a list-page store needs to hydrate from the URL on mount and write back on changes, the URL is the source of truth on first paint and the store wins after:

```ts
import queryString from "@mongez/query-string";

const store = {
  filters: {} as Record<string, any>,
  setFilters(next: Record<string, any>) {
    this.filters = next;
    queryString.update(next);              // mirror into URL
  },
};

// Hydrate at mount — call once.
function hydrateFromUrl() {
  store.filters = queryString.all();
}

// Catch real back/forward navigation. `update` doesn't fire `popstate`,
// so this only re-reads when the user uses the browser buttons.
window.addEventListener("popstate", hydrateFromUrl);
window.addEventListener("DOMContentLoaded", hydrateFromUrl);
```

### Toggle a multi-select facet

Each tag toggles in and out of the URL's `tags[]` array. The serializer emits one entry per array element:

```ts
function getSelectedTags(): string[] {
  const tags = queryString.get("tags") as string[] | string | null;
  if (tags == null) return [];
  return Array.isArray(tags) ? tags : [tags];   // a single tag parses as a 1-element array
}

function toggleTag(tag: string) {
  const current = getSelectedTags();
  const next = current.includes(tag)
    ? current.filter(t => t !== tag)
    : [...current, tag];
  queryString.update({ ...queryString.all(), tags: next });
}

// "/list?tags[]=books" → toggleTag("fiction") → "/list?tags[]=books&tags[]=fiction"
```

### Push a history entry instead of replacing

`update` is hard-coded to `replaceState` so filter changes don't pollute the back-stack. When a navigation should be a real entry (e.g. moving to a saved view), build the URL by hand and call `pushState`:

```ts
function navigateToSavedView(name: string, params: Record<string, any>) {
  const qs = queryString.toQueryString(params);
  const url = `${location.pathname}${qs ? "?" + qs : ""}`;
  history.pushState({ view: name }, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
```

The synthetic `popstate` lets routers and subscribers react as if the user navigated. Use sparingly — it's a workaround, not part of the package's contract.

### Parse a server request URL

`parse` doesn't touch `window`, so it works for SSR, route handlers, and tests:

```ts
import queryString from "@mongez/query-string";

function getFiltersFromRequest(reqUrl: string): Record<string, any> {
  const queryIndex = reqUrl.indexOf("?");
  if (queryIndex < 0) return {};
  return queryString.parse(reqUrl.substring(queryIndex));
}

getFiltersFromRequest("/api/products?tag=books&page=2");
// → { tag: "books", page: 2 }
```

Do NOT call `all` / `get` / `toString` / `update` on the server — they reach for `window.location` and `window.history` and will throw.

---

## TypeScript

The default export is a single object with seven methods, all internally typed:

```ts
import queryString from "@mongez/query-string";

const filters = queryString.parse("?tag=books&page=2");
// filters: Record<string, any>
```

Values come back as `any` because URL parsing is inherently dynamic — coerce or validate at the call site for stronger guarantees (e.g. `zod` on the result of `parse`).

The two internal parsers are also reachable for callers that want to bypass the facade:

```ts
import { toObjectParser, toStringParser } from "@mongez/query-string/src/query-string-parsers";
```

These are implementation details, not part of the stable surface — prefer the default export.

---

## Related packages

| Package | Use when you need |
|---|---|
| [`@mongez/concat-route`](https://github.com/hassanzohdy/concat-route) | URL and path building — join, normalize, slugify segments. Pairs naturally with `queryString.toQueryString` to compose full URLs. |
| [`@mongez/react-router`](https://github.com/hassanzohdy/mongez-react-router) | Router primitives for React apps. Drop `queryString` into route handlers for filter-driven views. |
| [`@mongez/cache`](https://github.com/hassanzohdy/mongez-cache) | Browser cache layer — pair with a URL hydrator when the URL is too short to hold the full filter state. |

---

## Further reading

- [`llms-full.txt`](./llms-full.txt) — exhaustive single-file API surface for tool-assisted development.
- [`CHANGELOG.md`](./CHANGELOG.md) — release notes and documented quirks.
- [`skills/`](./skills) — per-topic deep dives (parse, serialize, recipes, overview).

---

## License

MIT — see [LICENSE](./LICENSE).
