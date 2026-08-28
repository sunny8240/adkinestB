import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const readArgument = (name) => {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : undefined;
};

const email = readArgument("email") || "admin@example.com";
const password = readArgument("password") || randomBytes(18).toString("base64url");

if (!email.includes("@")) {
  console.error("Use a valid email with --email=admin@example.com");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

console.log("Admin credentials generated. Copy these values into backend/.env:");
console.log(`ADMIN_EMAIL=${email}`);
console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
console.log("");
console.log(`Plain password (store securely): ${password}`);
