/** Minimal POSIX path helpers for virtual project paths in Android WebView. */
export const sep = "/";
export const delimiter = ":";
export function normalize(input: string): string {
  const absolute = String(input).startsWith("/");
  const parts: string[] = [];
  for (const part of String(input).replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { if (parts.length && parts[parts.length - 1] !== "..") parts.pop(); else if (!absolute) parts.push(".."); }
    else parts.push(part);
  }
  const joined = parts.join("/") || ".";
  return absolute ? "/" + joined : joined;
}
export function join(...parts: string[]): string { return normalize(parts.filter(Boolean).join("/")); }
export function resolve(...parts: string[]): string { return normalize("/" + parts.filter(Boolean).join("/")); }
export function isAbsolute(input: string): boolean { return String(input).startsWith("/"); }
export function dirname(input: string): string { const value = normalize(input); const i = value.lastIndexOf("/"); return i < 0 ? "." : i === 0 ? "/" : value.slice(0, i); }
export function basename(input: string, suffix = ""): string { let value = normalize(input).split("/").pop() || ""; if (suffix && value.endsWith(suffix)) value = value.slice(0, -suffix.length); return value; }
export function extname(input: string): string { const base = basename(input); const i = base.lastIndexOf("."); return i <= 0 ? "" : base.slice(i); }
export function relative(from: string, to: string): string { const a = resolve(from).split("/").filter(Boolean); const b = resolve(to).split("/").filter(Boolean); while (a.length && b.length && a[0] === b[0]) { a.shift(); b.shift(); } return [...a.map(() => ".."), ...b].join("/") || ""; }
const posix = { sep, delimiter, normalize, join, resolve, isAbsolute, dirname, basename, extname, relative };
export { posix };
export default posix;
