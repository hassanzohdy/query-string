---
name: mongez-query-string-recipes
description: Apply @mongez/query-string to URL-backed filters, pagination, array facets, server request parsing, and browser history synchronization.
---

# Query-string recipes

## Filter and pagination state

Read the existing browser state, change one value, and reset pagination when a
filter changes:

```ts
import queryString from "@mongez/query-string";

type Filters = { tag?: string; page?: number };

function applyTag(tag: string) {
  const current = queryString.all() as Filters;
  queryString.update({ ...current, tag, page: 1 });
}
```

## Toggle an array facet

`tags[]` always parses as an array. Preserve the remaining query fields when
you change it:

```ts
function toggleTag(tag: string) {
  const current = queryString.all();
  const tags = Array.isArray(current.tags) ? current.tags : [];
  const next = tags.includes(tag)
    ? tags.filter(value => value !== tag)
    : [...tags, tag];

  queryString.update({ ...current, tags: next });
}
```

## Parse an incoming server URL

Use `parse`, not browser helpers, in SSR, route handlers, or workers:

```ts
function filtersFromRequest(url: string) {
  const index = url.indexOf("?");
  return index < 0 ? {} : queryString.parse(url.substring(index));
}
```

## React to browser navigation

`update` uses `replaceState`, so it does not emit `popstate`. Hydrate on load
and listen for back/forward navigation separately:

```ts
function hydrateFilters() {
  store.setFilters(queryString.all());
}

window.addEventListener("DOMContentLoaded", hydrateFilters);
window.addEventListener("popstate", hydrateFilters);
```

## Next topic

- [Parsing rules and edge cases](../parse/SKILL.md)
- [Serialization and replace-state behavior](../serialize/SKILL.md)
