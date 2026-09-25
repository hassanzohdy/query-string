---
name: mongez-query-string-parse
description: Parse @mongez/query-string input with numeric coercion, key[] arrays, bracketed objects, URI decoding, and browser URL reads.
---

# Parse query strings

Use `parse` for supplied text. It accepts text with or without a leading `?`:

```ts
import queryString from "@mongez/query-string";

const filters = queryString.parse(
  "?page=2&tags[]=books&tags[]=fiction&user[name]=Dina",
);
// { page: 2, tags: ["books", "fiction"], user: { name: "Dina" } }
```

`all()` has the same parsing behavior but defaults to `window.location.search`:

```ts
const filters = queryString.all(); // browser only
const supplied = queryString.all("?page=2");
```

## Rules that affect application code

- Numeric-looking values become numbers: `page=2` becomes `{ page: 2 }` and
  `zip=007` becomes `{ zip: 7 }`. Booleans remain strings.
- `tags[]=a&tags[]=b` produces `tags: ["a", "b"]`; repeated plain keys use
  the last value.
- `user[name]=Dina` produces `user: { name: "Dina" }`, including deeper
  bracket nesting.
- Non-numeric values are decoded with `decodeURIComponent`; `+` remains a
  literal plus rather than becoming a space.
- Unsafe path segments `__proto__`, `constructor`, and `prototype` are
  ignored. Parsed objects use a null prototype, so spread them when a normal
  object prototype is required.

## Read one browser value

`get` applies its fallback with `||`, so a parsed `0`, empty string, `false`,
or `null` also returns the fallback. Use `key in queryString.all()` for a
presence check.

```ts
const page = queryString.get("page", 1);
const hasPage = "page" in queryString.all();
```

## Next topic

- [Serialize the inverse shape](../serialize/SKILL.md)
- [Use the result in URL-state recipes](../recipes/SKILL.md)
