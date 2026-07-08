/**
 * One-time script to generate a Google Calendar refresh token.
 *
 * Prerequisites:
 *   1. Create a Google Cloud project at console.cloud.google.com
 *   2. Enable the Google Calendar API
 *   3. Create OAuth 2.0 credentials → choose "Desktop app" type
 *   4. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/google-auth.mjs
 *
 * Run once for your personal account, once for your school account.
 * Add the output tokens to .env.local as GOOGLE_REFRESH_TOKEN_PERSONAL / GOOGLE_REFRESH_TOKEN_SCHOOL.
 */

import { google } from "googleapis";
import http from "http";
import { URL } from "url";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 9876;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.\n" +
    "Usage: GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-auth.mjs"
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/calendar.readonly"],
  prompt: "consent", // always return a refresh token
});

console.log("\n=== Google Calendar Auth ===\n");
console.log("Open this URL in your browser (sign into the correct Google account):\n");
console.log(authUrl);
console.log("\nWaiting for Google to redirect back on port", PORT, "...\n");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(400);
      res.end(`Authorization failed: ${error}`);
      console.error("Authorization failed:", error);
      server.close();
      return;
    }

    if (!code) {
      res.writeHead(400);
      res.end("No authorization code received.");
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html><body style="font-family:monospace;padding:2rem">
        <h2>✅ Success! Copy the token below into .env.local</h2>
        <p>For your personal account (jacobhorne09@gmail.com):</p>
        <pre style="background:#f0f0f0;padding:1rem">GOOGLE_REFRESH_TOKEN_PERSONAL=${tokens.refresh_token}</pre>
        <p>For your school account (@uci.edu):</p>
        <pre style="background:#f0f0f0;padding:1rem">GOOGLE_REFRESH_TOKEN_SCHOOL=${tokens.refresh_token}</pre>
        <p>You can close this tab.</p>
      </body></html>
    `);

    console.log("\n✅ Refresh token received!\n");
    console.log("Add to .env.local (use the correct variable name for this account):\n");
    console.log(`GOOGLE_REFRESH_TOKEN_PERSONAL=${tokens.refresh_token}`);
    console.log("  - or -");
    console.log(`GOOGLE_REFRESH_TOKEN_SCHOOL=${tokens.refresh_token}`);
    console.log();
  } catch (err) {
    res.writeHead(500);
    res.end(`Error: ${err.message}`);
    console.error("Error exchanging code:", err.message);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(PORT, () => {
  // ready
});
