---
name: mongez-query-string-serialize
description: Serialize objects with @mongez/query-string and replace the current browser URL using arrays, nested keys, encoded values, and update.
---

# Serialize and update URLs

Build query text with `toQueryString`. It is pure and works outside the
browser:

```ts
import queryString from "@mongez/query-string";

queryString.toQueryString({
  page: 2,
  tags: ["books", "fiction"],
  user: { name: "Dina" },
});
// "page=2&tags[]=books&tags[]=fiction&user[name]=Dina"
```

## Serialization rules

- Arrays emit one `key[]=value` pair per item; an empty array contributes no
  text.
- Nested objects emit bracketed keys: `{ user: { name: "Dina" } }` becomes
  `user[name]=Dina`.
- Values are encoded with `encodeURIComponent`. Pass raw values rather than
  pre-encoding them, or percent escapes will be encoded again.
- `null` emits `key=null`; `undefined` emits `key=undefined`.
- A string input is returned unchanged, so already-built text can be passed to
  `update`.

## Replace the browser query

`update` keeps the current pathname and uses `history.replaceState`. It does
not reload the page, create a history entry, or dispatch `popstate`.

```ts
queryString.update({ tag: "books", page: 3 });
// pathname stays the same; search becomes ?tag=books&page=3

queryString.update({}); // remove the search portion
```

Use `history.pushState` yourself when the change must create a back-button
entry. `toString()` returns the current browser query without its leading `?`.

## Next topic

- [Understand parsed values](../parse/SKILL.md)
- [Apply this to filters and navigation](../recipes/SKILL.md)
