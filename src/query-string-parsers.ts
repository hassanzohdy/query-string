type ObjectType = Record<string, any>;

const isNumeric = (value: any) => !isNaN(value - parseFloat(value));

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isForbiddenKey = (key: string) => FORBIDDEN_KEYS.has(key);

// Malformed percent-encoding (`%`, `%ZZ`, a truncated UTF-8 sequence) makes
// `decodeURIComponent` throw a URIError. Keep the raw text instead of throwing.
const safeDecode = (value: any): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return String(value);
  }
};

const isContainer = (value: any) => typeof value === "object" && value !== null;

export function toObjectParser(query: string) {
  const vars = query.split("&");
  const result: ObjectType = Object.create(null);

  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split("=");
    const isArrayKey = pair[0].includes("[]");

    const key = pair[0].replace("[]", "");
    let value: string | number = pair[1];

    if (value === undefined) {
      value = "";
    } else if (isNumeric(value)) {
      value = Number(value);
    } else {
      value = safeDecode(value);
    }

    const keys = key.split("[");

    if (keys.some((rawKey) => isForbiddenKey(rawKey.replace("]", "")))) {
      continue;
    }

    let currentObj = result;
    for (let j = 0; j < keys.length; j++) {
      const currentKey = keys[j].replace("]", "");

      if (j === keys.length - 1) {
        if (isArrayKey) {
          const existing = currentObj[currentKey];
          if (Array.isArray(existing)) {
            existing.push(value);
          } else if (existing === undefined || isContainer(existing)) {
            // nothing yet, or an object: the array replaces it
            currentObj[currentKey] = [value];
          } else {
            // a scalar seen earlier under the same key joins the array
            currentObj[currentKey] = [existing, value];
          }
        } else {
          currentObj[currentKey] = value;
        }
      } else {
        // a scalar or an array under the same key is replaced by the object
        if (!isContainer(currentObj[currentKey]) || Array.isArray(currentObj[currentKey])) {
          currentObj[currentKey] = Object.create(null);
        }
        currentObj = currentObj[currentKey];
      }
    }
  }

  return result;
}

export function toStringParser(params: ObjectType, parentKey?: string): string {
  const newParams: ObjectType = { ...params };
  const queryString = Object.keys(newParams)
    .map((key) => {
      const value = newParams[key];
      const updatedKey = parentKey ? `${parentKey}[${key}]` : key;

      if (value === null) {
        return `${updatedKey}=null`;
      } else if (typeof value === "object" && !Array.isArray(value)) {
        return toStringParser(value, updatedKey);
      } else if (Array.isArray(value)) {
        return value.map((v) => `${updatedKey}[]=${encodeURIComponent(v)}`).join("&");
      } else {
        return `${updatedKey}=${encodeURIComponent(value)}`;
      }
    })
    .join("&");

  return queryString;
}
