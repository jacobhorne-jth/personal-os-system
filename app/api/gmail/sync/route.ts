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

function compactLines(lines: Array<string | false | null | undefined>) {
  return lines.filter((line): line is string => typeof line === "string" && line.trim().length > 0);
}

function findResponsibilityByName(responsibilities: Responsibility[], names: string[]) {
  const active = responsibilities.filter((r) => !r.archivedAt);
  return active.find((responsibility) =>
    names.some((name) => responsibility.name.toLowerCase() === name.toLowerCase())
  );
}

function routingHints(email: ParsedEmail, responsibilities: Responsibility[]) {
  const active = responsibilities.filter((r) => !r.archivedAt);
  const recruiting = findResponsibilityByName(active, ["Recruiting", "Recruitment"]);
  const source = email.sourceName.toLowerCase();
  const professionalSource = /\b(work|professional|career|recruiting)\b/i.test(source);
  const schoolSource = /\b(school|college|university|gatech|gt)\b/i.test(source);
  return compactLines([
    recruiting && `Recruiting label id: "${recruiting.id}"`,
    professionalSource && recruiting && `Professional email default for interviews, coffee chats, recruiters, applications, hiring, offer, onsite, phone screen, and recruiting events: "${recruiting.id}"`,
    schoolSource && "School email routing: use a club-specific existing label only when the subject, sender, or body strongly mentions that exact club/organization label; otherwise use the safest school/general label.",
    active.length > 0 && `Existing label names: ${active.map((r) => `"${r.name}" -> "${r.id}"`).join(", ")}`,
  ]).join("\n");
}

function routeResponsibilityId(email: ParsedEmail, proposedId: string | undefined, responsibilities: Responsibility[]) {
  const active = responsibilities.filter((r) => !r.archivedAt);
  const fallbackId = fallbackResponsibility(active);
  const existing = active.find((r) => r.id === proposedId);
  const text = `${email.sourceName} ${email.from} ${email.subject} ${email.snippet} ${email.body}`.toLowerCase();
  const source = email.sourceName.toLowerCase();
  const recruiting = findResponsibilityByName(active, ["Recruiting", "Recruitment"]);
  const recruitingSignal = /\b(interview|coffee chat|recruiter|recruiting|hiring|application|phone screen|onsite|offer|greenhouse|lever|workday)\b/i.test(text);
  const professionalSource = /\b(work|professional|career|recruiting)\b/i.test(source);

  if (recruiting && (professionalSource || recruitingSignal) && recruitingSignal) {
    return recruiting.id;
  }

  const schoolSource = /\b(school|college|university|gatech|gt)\b/i.test(source);
  if (schoolSource) {
    const exactLabelMatch = active.find((responsibility) => {
      const name = responsibility.name.toLowerCase();
      return name.length >= 3 && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
    });
    if (exactLabelMatch) return exactLabelMatch.id;
  }

  return existing?.id ?? fallbackId;
}

function normalizeProposalResponsibilities<T extends { responsibilityId?: string }>(
  email: ParsedEmail,
  items: T[],
  responsibilities: Responsibility[],
) {
  return items.map((item) => ({
    ...item,
    responsibilityId: routeResponsibilityId(email, item.responsibilityId, responsibilities),
  }));
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

Routing hints:
${routingHints(email, responsibilities)}

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
- This output becomes an in-app Inbox review card. Nothing is committed until Jacob approves it.
- Be conservative. If it is marketing, newsletter, receipt, automated alert, or no personal action is needed, set shouldIgnore true and all arrays empty.
- If the email requires Jacob to respond, create one response/follow-up task due today at 11:59 PM unless a deadline is explicit. Title it like "Respond to Jane about scheduling" or "Respond to Company interview email".
- If an interview, coffee chat, recruiter call, or recruiting event asks Jacob to schedule, choose times, confirm availability, or reply, create a response task only. Do not create an event.
- If an interview, coffee chat, recruiter call, or meeting has one confirmed date/time, create a proposed calendar event for review. Also create a response task only if Jacob still needs to reply.
- For confirmed interviews, also create a prep task when useful.
- If the email lists multiple possible times, tentative holds, or unconfirmed availability but no confirmed final time, create a task to confirm/schedule, not an event.
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
    sourceTitle: `${email.from} - ${email.subject}`,
    sourceDetail: compactLines([
      `Inbox: ${email.sourceName}`,
      `From: ${email.from}`,
      `Subject: ${email.subject}`,
      email.date && `Date: ${email.date}`,
      email.snippet && `Snippet: ${email.snippet}`,
      email.body && `Body:\n${email.body}`,
    ]).join("\n\n"),
    summary: raw.summary || `${email.from} - ${email.subject}`,
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0.75,
    status: "pending_review",
    decisions: {},
    proposedTasks: normalizeProposalResponsibilities(email, proposedTasks, responsibilities),
    proposedEvents: normalizeProposalResponsibilities(email, proposedEvents, responsibilities),
    proposedNotes: normalizeProposalResponsibilities(email, proposedNotes, responsibilities),
    proposedListItems: normalizeProposalResponsibilities(email, proposedListItems, responsibilities),
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
