import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.NOTION_ENCRYPTION_KEY;
  // Si no hay clave configurada, usar una clave por defecto para desarrollo (NO usar en producción)
  if (!key) {
    console.warn("NOTION_ENCRYPTION_KEY no está configurada. Usando clave por defecto (solo para desarrollo)");
    // Usar PBKDF2 para generar una clave de exactamente 32 bytes desde una semilla
    return crypto.pbkdf2Sync("notion-default-dev-key", "notion-salt", 100000, KEY_LENGTH, "sha256");
  }
  // Si la clave es menor a 32 bytes, derivarla usando PBKDF2
  if (key.length < KEY_LENGTH) {
    return crypto.pbkdf2Sync(key, "notion-salt", 100000, KEY_LENGTH, "sha256");
  }
  // Si la clave es mayor o igual a 32 bytes, tomar exactamente 32 bytes
  const keyBuffer = Buffer.from(key, "utf-8");
  if (keyBuffer.length >= KEY_LENGTH) {
    return keyBuffer.slice(0, KEY_LENGTH);
  }
  // Si por alguna razón no alcanza, usar PBKDF2
  return crypto.pbkdf2Sync(key, "notion-salt", 100000, KEY_LENGTH, "sha256");
}

export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // Combinar IV + tag + encrypted data
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
}

export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey();
  const parts = encryptedToken.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
