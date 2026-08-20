import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Public report tokens.
 *
 * Reports are reachable by URL without an account, so the token *is* the
 * credential. It must be cryptographically random and long enough that
 * enumeration is infeasible — never a sequential id or a timestamp.
 */

/** Unambiguous alphabet: no 0/O or 1/l/I to survive being read aloud. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const TOKEN_LENGTH = 32; // ~157 bits of entropy at 31 symbols.

export function generatePublicToken(length = TOKEN_LENGTH): string {
  const alphabetLength = ALPHABET.length;
  // Reject bytes in the biased tail so every symbol is equally likely.
  const maxUnbiased = Math.floor(256 / alphabetLength) * alphabetLength - 1;
  let token = "";
  while (token.length < length) {
    const bytes = randomBytes(length * 2);
    for (const byte of bytes) {
      if (token.length >= length) break;
      if (byte > maxUnbiased) continue;
      token += ALPHABET[byte % alphabetLength];
    }
  }
  return token;
}

const TOKEN_RE = new RegExp(`^[${ALPHABET}]{16,64}$`);

export function isValidTokenFormat(token: string): boolean {
  return TOKEN_RE.test(token);
}

/** Constant-time comparison for any token equality check. */
export function tokensEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
