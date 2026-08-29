import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";

const app = createApp();
let initialized = false;

async function initialize(): Promise<void> {
  if (!initialized) {
    await connectDatabase();
    initialized = true;
  }
}

export default async function handler(
  req: any,
  res: any
): Promise<void> {
  await initialize();

  app(req, res);
}
