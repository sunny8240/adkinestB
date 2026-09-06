import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
const app = createApp();
let initialized = false;
async function initialize() {
    if (!initialized) {
        await connectDatabase();
        initialized = true;
    }
}
export default async function handler(req, res) {
    await initialize();
    app(req, res);
}
