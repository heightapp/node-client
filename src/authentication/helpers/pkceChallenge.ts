// From https://github.com/crouchcd/pkce-challenge
// Updated to support ESM + commonJS + no-need for crypto-js

import crypto from 'crypto';

/** Generate cryptographically strong random string
 * @param size The desired length of the string
 * @returns The random string
 */
function random(size: number) {
  const mask = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
  let result = '';
  const randomUints = crypto.randomBytes(size);
  for (let i = 0; i < size; i++) {
    // cap the value of the randomIndex to mask.length - 1
    const randomIndex = randomUints[i] % mask.length;
    result += mask[randomIndex];
  }
  return result;
}

/** Generate a PKCE challenge verifier
 * @param length Length of the verifier
 * @returns A random verifier `length` characters long
 */
function generateVerifier(length: number): string {
  return random(length);
}

/** Generate a PKCE code challenge from a code verifier
 * @param codeVerifier
 * @returns The base64 url encoded code challenge
 */
export function generateChallenge(codeVerifier: string) {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

/** Generate a PKCE challenge pair
 * @param length Length of the verifer (between 43-128). Defaults to 43.
 * @returns PKCE challenge pair
 */
export default function pkceChallenge(length?: number): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const dataLength = length || 43;
  if (dataLength < 43 || dataLength > 128) {
    throw new Error(`Expected a length between 43 and 128. Received ${dataLength}.`);
  }

  const codeVerifier = generateVerifier(dataLength);
  const codeChallenge = generateChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
  };
}

/** Verify that a code_verifier produces the expected code challenge
 * @param codeVerifier
 * @param expectedChallenge The code challenge to verify
 * @returns True if challenges are equal. False otherwise.
 */
export function verifyChallenge(codeVerifier: string, expectedChallenge: string) {
  const actualChallenge = generateChallenge(codeVerifier);
  return actualChallenge === expectedChallenge;
}
