---
name: mongez-query-string-overview
description: Understand the @mongez/query-string default export, its pure parse and serialization methods, and its browser-only URL helpers.
---

# @mongez/query-string overview

```ts
import queryString from "@mongez/query-string";
```

The default export has six methods:

| Method | Use | Runtime |
| --- | --- | --- |
| `parse(text)` | Parse supplied search text. | Any runtime |
| `toQueryString(params)` | Serialize an object or pass through a string. | Any runtime |
| `all(text?)` | Parse supplied text, or `window.location.search` by default. | Browser when no text is supplied |
| `get(key, fallback?)` | Read one key from the current browser URL. | Browser |
| `toString()` | Read the current search text without `?`. | Browser |
| `update(params)` | Replace the current URL search with serialized params. | Browser |

`parse` and `toQueryString` are the server-safe pair. Browser helpers access
`window`; guard them when a module is shared with SSR or workers.

```ts
const filters = queryString.parse("?page=2&tags[]=books");
// { page: 2, tags: ["books"] }

const search = queryString.toQueryString({ page: 3, tags: ["books"] });
// "page=3&tags[]=books"
```

Parsing converts numeric-looking values to numbers, arrays use `key[]`, and
nested values use bracket keys such as `user[name]`. Serialization uses the
same shapes and encodes values with `encodeURIComponent`.

## Next topic

- [Parse query strings](../parse/SKILL.md)
- [Serialize and update URLs](../serialize/SKILL.md)
- [Recipes](../recipes/SKILL.md)
