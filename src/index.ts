import { toObjectParser, toStringParser } from "./query-string-parsers";
type ObjectType = Record<string, any>;

const queryStringOptions = {
  objectParser: toObjectParser,
  stringParser: toStringParser,
};

const queryString = {
  /**
   * Convert query string to object
   */
  all(queryStringText = window.location.search) {
    const query = queryStringText?.startsWith("?")
      ? queryStringText.substring(1)
      : queryStringText;

    if (!query) return {};

    return queryStringOptions.objectParser(query);
  },
  /**
   * Parse the given query string
   */
  parse(searchParams: string) {
    if (searchParams.startsWith("?")) {
      searchParams = searchParams.substring(1);
    }

    if (!searchParams) return {};
    return queryStringOptions.objectParser(searchParams);
  },
  /**
   * Get key from query string
   */
  get(key: string, defaultValue: any = null) {
    const all = queryString.all();
    return all[key] || defaultValue;
  },
  /**
   * Replace query string in the url with the given object
   */
  update(params: Record<string, any> | string) {
    const queryStringText = queryString.toQueryString(params);

    const url = `${window.location.pathname}${
      queryStringText ? "?" + queryStringText : ""
    }`;

    window.history.replaceState({}, "", url);
  },
  /**
   * Get query string as string
   */
  toString() {
    return window.location.search.substring(1);
  },
  /**
   * Convert the given object|string to query string
   */
  toQueryString(params: ObjectType | string) {
    if (typeof params === "string") return params;

    return queryStringOptions.stringParser(params);
  },
};

export default queryString;
