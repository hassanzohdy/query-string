---
description: >-
  Use @mongez/query-string to turn URL search text into objects and objects into query strings. Start with parse for request, SSR, worker, or test input; use toQueryString to build links; and use all, get, toString, or update only in browser code that reads or replaces window.location.search. The package supports numeric coercion, repeated key[] arrays, bracketed nested objects, encoded values, and history.replaceState updates without a page reload. Choose a topic for parsing rules, serialization behavior, or URL-state recipes.
---

# @mongez/query-string

## The 80% path: URL-backed filters

Use the default export. Read the current browser query once, change the values,
then replace the query without adding a history entry:

```ts
import queryString from "@mongez/query-string";

const current = queryString.all() as { tag?: string; page?: number };

queryString.update({
  ...current,
  tag: "books",
  page: 1,
});
// /products?tag=books&page=1
```

For code that does not have `window`, use the pure pair instead:

```ts
const filters = queryString.parse("?page=2&tags[]=books&tags[]=fiction");
const search = queryString.toQueryString({ ...filters, page: 3 });
```

## Topics

- [Overview](./overview/SKILL.md) — API boundaries and runtime model.
- [Parse query strings](./parse/SKILL.md) — coercion, decoding, arrays, nesting, and safe reads.
- [Serialize and update URLs](./serialize/SKILL.md) — output shapes, encoding, and browser writes.
- [Recipes](./recipes/SKILL.md) — filters, facets, server parsing, and history integration.

## Not this package →

- [`URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams) for the platform API when bracket nesting and numeric coercion are not wanted.
- [`@mongez/concat-route`](https://www.npmjs.com/package/@mongez/concat-route) for composing and normalizing path segments; pair its result with `toQueryString` for the search portion.
- A schema validator such as [`zod`](https://zod.dev/) when parsed URL values need application-level validation or defaults.
