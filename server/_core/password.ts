import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

function scrypt(password: string, salt: string, keyLength: number, options: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
  })) as Buffer;
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, salt, storedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !salt || !storedHex) return false;
  try {
    const expected = Buffer.from(storedHex, "hex");
    const derived = (await scrypt(password, salt, expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
    })) as Buffer;
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
