// utils/passwordUtils.ts
// ⚠️ Catatan: Untuk production gunakan bcrypt atau argon2.
// Ini hanya untuk simulasi/simple demo.

export const hashPassword = async (password: string, salt = "classroom_salt"): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

export const verifyPassword = async (password: string, hashedPassword: string, salt = "classroom_salt"): Promise<boolean> => {
  const hashedInput = await hashPassword(password, salt);
  return hashedInput === hashedPassword;
};

export const generateRandomPassword = (length: number = 10): string => {
  // Gunakan crypto API agar lebih aman
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues).map(v => charset[v % charset.length]).join("");
};

export const generatePasswordFromBirthDate = (birthDate: string): string => {
  // Format: YYYY-MM-DD → DDMMYYYY
  const date = new Date(birthDate);
  if (isNaN(date.getTime())) {
    throw new Error("Tanggal lahir tidak valid");
  }
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString();
  return `${day}${month}${year}`;
};

export const generateResetToken = (length: number = 32): string => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues).map(v => charset[v % charset.length]).join("");
};
