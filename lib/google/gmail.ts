import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { createGoogleOAuthClient } from "@/lib/google/calendar";

export type GmailSource = {
  name: string;
  refreshToken: string;
};

export type ParsedEmail = {
  id: string;
  threadId?: string;
  sourceName: string;
  from: string;
  subject: string;
  date?: string;
  snippet: string;
  body: string;
};

function decodeBase64Url(value?: string | null) {
  if (!value) return "";
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function plainTextFromPayload(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts?.length) {
    const plain = payload.parts.map(plainTextFromPayload).filter(Boolean).join("\n");
    if (plain.trim()) return plain;
    const html = payload.parts.find((part) => part.mimeType === "text/html" && part.body?.data);
    if (html?.body?.data) {
      return decodeBase64Url(html.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    }
  }
  return decodeBase64Url(payload.body?.data);
}

function headerValue(message: gmail_v1.Schema$Message, name: string) {
  return message.payload?.headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export function gmailSourcesFromEnv(): GmailSource[] {
  const rawJson = process.env.GMAIL_SOURCES_JSON ?? process.env.GMAIL_SOURCES;
  if (rawJson?.trim()) {
    try {
      const parsed = JSON.parse(rawJson) as Array<{ name?: string; refreshToken?: string }>;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((entry) => entry.refreshToken)
          .map((entry, index) => ({ name: entry.name?.trim() || `Email ${index + 1}`, refreshToken: entry.refreshToken! }));
      }
    } catch {
      // Fall through to legacy environment variables.
    }
  }

  return [
    { name: "Personal", refreshToken: process.env.GMAIL_REFRESH_TOKEN_PERSONAL ?? process.env.GOOGLE_REFRESH_TOKEN_PERSONAL },
    { name: "School", refreshToken: process.env.GMAIL_REFRESH_TOKEN_SCHOOL ?? process.env.GOOGLE_REFRESH_TOKEN_SCHOOL },
    { name: "Work", refreshToken: process.env.GMAIL_REFRESH_TOKEN_WORK ?? process.env.GOOGLE_REFRESH_TOKEN_WORK },
  ].filter((source): source is GmailSource => Boolean(source.refreshToken));
}

export async function fetchRecentEmails(
  source: GmailSource,
  knownMessageIds: string[],
  maxResults = 10,
): Promise<ParsedEmail[]> {
  const auth = createGoogleOAuthClient(source.refreshToken);
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "newer_than:3d in:inbox -category:promotions -category:social -from:me",
  });

  const messages = res.data.messages ?? [];
  const known = new Set(knownMessageIds);
  const fresh = messages.filter((message) => message.id && !known.has(message.id)).slice(0, maxResults);

  const parsed = await Promise.all(
    fresh.map(async (message) => {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      });
      const data = full.data;
      const body = plainTextFromPayload(data.payload).replace(/\n{3,}/g, "\n\n").trim();
      return {
        id: data.id!,
        threadId: data.threadId ?? undefined,
        sourceName: source.name,
        from: headerValue(data, "from"),
        subject: headerValue(data, "subject") || "(no subject)",
        date: headerValue(data, "date") || undefined,
        snippet: data.snippet ?? "",
        body: body.slice(0, 6000),
      };
    }),
  );

  return parsed.filter((email) => email.id && (email.body || email.snippet));
}
