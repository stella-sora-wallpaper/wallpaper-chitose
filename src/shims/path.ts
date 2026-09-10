function normalize(path: string): string {
  return path.replace(/\\/g, "/");
}

function dirname(path: string): string {
  const normalized = normalize(path);
  const index = normalized.lastIndexOf("/");
  return index < 0 ? "." : normalized.slice(0, index) || ".";
}

function extname(path: string): string {
  const name = normalize(path).split("/").pop() ?? "";
  const index = name.lastIndexOf(".");
  return index <= 0 ? "" : name.slice(index);
}

function join(...parts: string[]): string {
  return parts
    .map((part, index) => index === 0 ? normalize(part).replace(/\/+$/g, "") : normalize(part).replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

export default { dirname, extname, join };
