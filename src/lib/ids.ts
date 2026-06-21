import { customAlphabet } from "nanoid";

// URL-safe, unambiguous alphabet for human-adjacent ids.
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(alphabet, 20);

export const newId = (prefix: string) => `${prefix}_${nano()}`;

/** Slugify a workspace name into a URL-safe handle. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const tokenAlphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const newToken = customAlphabet(tokenAlphabet, 40);
