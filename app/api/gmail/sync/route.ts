import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchRecentEmails, gmailSourcesFromEnv, type ParsedEmail } from "@/lib/google/gmail";
import type { CaptureExtraction, Responsibility } from "@/lib/types/domain";

type EmailProposal = Omit<CaptureExtraction, "id"> & {
  externalId: string;
  externalSource: "gmail";
};

function fallbackResponsibility(responsibilities: Responsibility[]) {
  return responsibilities.find((r) => !r.archivedAt)?.id ?? responsibilities[0]?.id ?? "";
}

function cleanJson(raw: string) {
  return raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
}

function emailPrompt(email: ParsedEmail, responsibilities: Responsibility[], today: string) {
  const respList = responsibilities
    .filter((r) => !r.archivedAt)
    .map((r) => `- id: "${r.id}" | name: ${r.name} | ${r.description}`)
    .join("\n");
  const fallbackId = fallbackResponsibility(responsibilities);

  return `Today: ${today}

Responsibilities:
${respList}

Email source: ${email.sourceName}
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date ?? "unknown"}
Snippet: ${email.snippet}

Body:
${email.body}

Return ONLY JSON with this exact shape:
{
  "summary": "short explanation",
  "confidence": 0.0,
  "shouldIgnore": false,
  "processedReason": "why you classified it this way",
  "proposedTasks": [
    { "title": "Reply to Jane re: Interview", "priority": "low|medium|high|urgent", "responsibilityId": "${fallbackId}", "dueAt": "ISO string or null" }
  ],
  "proposedEvents": [
    { "title": "Company interview", "type": "app_event", "responsibilityId": "${fallbackId}", "startsAt": "ISO string", "endsAt": "ISO string" }
  ],
  "proposedNotes": [],
  "proposedListItems": []
}

Rules:
- Be conservative. If it is marketing, newsletter, receipt, automated alert, or no personal action is needed, set shouldIgnore true and all arrays empty.
- If the email requires Jacob to respond, create one response/follow-up task due today at 11:59 PM unless a deadline is explicit.
- Interview emails usually produce: a response/schedule task, a prep task, and an event only when the time is confirmed.
- If the email lists multiple possible times but no confirmed time, create a task to choose a time, not an event.
- If there is a confirmed meeting/interview date and time, create a calendar event.
- If an event has no end time, default to 1 hour.
- Prefer one of the responsibility IDs exactly. Use "${fallbackId}" if unclear.
- Do not invent dates or times.
- Keep task titles under 70 characters.
- Use the email sender/company in titles when useful.
- confidence should be 0.9+ only for explicit action/confirmed timing, 0.65-0.89 for plausible review, below 0.65 for weak signals.`;
}

async function parseEmail(openai: OpenAI, email: ParsedEmail, responsibilities: Responsibility[], today: string): Promise<EmailProposal | null> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: "You classify emails for a personal productivity app. You create proposed tasks/events only when there is a clear personal action or confirmed meeting.",
      },
      { role: "user", content: emailPrompt(email, responsibilities, today) },
    ],
  });

  const raw = JSON.parse(cleanJson(completion.choices[0].message.content ?? "{}")) as {
    summary?: string;
    confidence?: number;
    shouldIgnore?: boolean;
    proposedTasks?: CaptureExtraction["proposedTasks"];
    proposedEvents?: CaptureExtraction["proposedEvents"];
    proposedNotes?: CaptureExtraction["proposedNotes"];
    proposedListItems?: CaptureExtraction["proposedListItems"];
  };

  const proposedTasks = Array.isArray(raw.proposedTasks) ? raw.proposedTasks : [];
  const proposedEvents = Array.isArray(raw.proposedEvents) ? raw.proposedEvents : [];
  const proposedNotes = Array.isArray(raw.proposedNotes) ? raw.proposedNotes : [];
  const proposedListItems = Array.isArray(raw.proposedListItems) ? raw.proposedListItems : [];

  if (raw.shouldIgnore || (proposedTasks.length === 0 && proposedEvents.length === 0 && proposedNotes.length === 0 && proposedListItems.length === 0)) {
    return null;
  }

  return {
    externalId: email.id,
    externalSource: "gmail",
    source: "email",
    summary: raw.summary || `${email.from} - ${email.subject}`,
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0.75,
    status: "pending_review",
    decisions: {},
    proposedTasks,
    proposedEvents,
    proposedNotes,
    proposedListItems,
  };
}

export async function POST(req: Request) {
  const localPreview = process.env.NEXT_PUBLIC_LOCAL_PREVIEW === "1";
  if (!localPreview) {
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sources = gmailSourcesFromEnv();
  if (!sources.length) {
    return NextResponse.json(
      { error: "No Gmail sources set. Add GMAIL_SOURCES_JSON or GMAIL_REFRESH_TOKEN_PERSONAL/SCHOOL/WORK to .env.local" },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email parsing is not configured (missing OPENAI_API_KEY)" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as {
    knownMessageIds?: string[];
    responsibilities?: Responsibility[];
  };
  const knownMessageIds = Array.isArray(body.knownMessageIds) ? body.knownMessageIds : [];
  const responsibilities = Array.isArray(body.responsibilities) ? body.responsibilities : [];
  const today = new Date().toISOString().slice(0, 10);
  const openai = new OpenAI({ apiKey });

  const proposals: EmailProposal[] = [];
  const processedMessageIds: string[] = [];
  const errors: string[] = [];

  for (const source of sources) {
    try {
      const emails = await fetchRecentEmails(source, knownMessageIds, 8);
      for (const email of emails) {
        try {
          const proposal = await parseEmail(openai, email, responsibilities, today);
          processedMessageIds.push(email.id);
          if (proposal) proposals.push(proposal);
        } catch (err) {
          errors.push(`${source.name} / ${email.subject}: ${String(err)}`);
        }
      }
    } catch (err) {
      errors.push(`${source.name}: ${String(err)}`);
    }
  }

  return NextResponse.json({ proposals, processedMessageIds, errors });
}
