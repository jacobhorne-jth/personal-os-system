import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { text, source, responsibilities, currentDate, todayIso, imageBase64, imageMimeType } = await req.json();

  if (!text?.trim() && !imageBase64) {
    return NextResponse.json({ error: "No text or image provided" }, { status: 400 });
  }

  const respList = (responsibilities ?? [])
    .map((r: { id: string; name: string; description: string }) =>
      `- id: "${r.id}" | name: ${r.name} | ${r.description}`
    )
    .join("\n");

  const fallbackId = responsibilities?.[0]?.id ?? "personal";
  const today = todayIso ?? new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are a personal assistant for Jacob. Parse raw input into structured actions.

Today: ${currentDate}
Today ISO date: ${today}

Jacob's responsibilities — always use one of these IDs exactly:
${respList}

Return ONLY valid JSON (no markdown, no backticks) with this exact shape:
{
  "summary": "one-sentence description of what this capture is about",
  "confidence": 0.9,
  "proposedTasks": [
    { "title": "...", "priority": "low|medium|high", "responsibilityId": "${fallbackId}", "dueAt": null }
  ],
  "proposedEvents": [
    { "title": "...", "type": "app_event", "responsibilityId": "${fallbackId}", "startsAt": "2025-01-15T14:00:00Z", "endsAt": "2025-01-15T15:00:00Z" }
  ],
  "proposedNotes": [
    { "title": "...", "body": "...", "responsibilityId": "${fallbackId}" }
  ],
  "proposedListItems": [
    { "listTitle": "...", "itemTitle": "...", "responsibilityId": "${fallbackId}" }
  ]
}

Parsing rules by input type:
- EMAIL: extract sender/subject, create a "Reply to [name] re: [subject]" task; extract any mentioned dates/times as calendar events
- MEETING NOTES: create one note with the full content formatted cleanly; create one task per action item identified
- VOICE / TYPED: create tasks and/or events as appropriate; if a time is mentioned, prefer an event over a task
- PASTE (generic): detect the content type and apply the matching rule above
- TIME LOG: create a single event with type "time_log"

SCREENSHOT RULES (apply when an image is attached):
- Read all visible text in the image carefully
- If the image shows an EMAIL (Gmail, Outlook, Apple Mail, Yahoo Mail, etc.):
  - Read the sender name and subject line
  - Create ONE task: "Reply to [sender name] re: [subject]"
  - Set dueAt to "${today}T23:59:00Z"
  - Set priority to "high" if subject seems urgent, otherwise "medium"
  - Choose responsibilityId based on the email content
- If the image shows a LINKEDIN message, connection request, or InMail:
  - Read the sender name and message preview
  - Create ONE task: "Respond to [name] on LinkedIn"
  - Set dueAt to "${today}T23:59:00Z"
  - responsibilityId: pick most relevant (recruiting if job/career related)
- If the image shows a TEXT, iMESSAGE, WHATSAPP, SLACK, DISCORD, or similar chat:
  - Create ONE task: "Reply to [name] on [platform]"
  - Set dueAt to "${today}T23:59:00Z"
- If the image shows something else (article, doc, screenshot of notes):
  - Apply normal parsing rules for the detected content
- When user adds context text like "respond to this later" — that confirms the task creation intent; do not second-guess it
- For screenshots: strongly prefer tasks over events unless a meeting is explicitly mentioned

COMMUNICATION RESPONSE RULE (applies to ALL input types):
- Any task that is about replying, responding, or following up with a specific person defaults to dueAt "${today}T23:59:00Z" UNLESS the input explicitly mentions a different date or timeframe
- This includes: "Reply to X", "Respond to X on Y", "Follow up with X", "Message X back", "Get back to X"
- The intent is: if someone messaged Jacob, he wants to respond today

Additional rules:
- Match responsibilityId to the most relevant responsibility by context; use "${fallbackId}" when unclear
- dueAt must be a full ISO 8601 string or null — never a partial date string
- For events without an end time, default to 1 hour after start
- Times without dates: assume the next upcoming occurrence of that day/time from today
- Keep task titles under 60 characters
- All 4 arrays must be present (use [] when empty)
- confidence: 0.9 for clear input, 0.7 for ambiguous`;

  try {
    let messageContent: string | OpenAI.Chat.ChatCompletionContentPart[];

    if (imageBase64) {
      const mime = (imageMimeType ?? "image/png") as "image/png" | "image/jpeg" | "image/gif" | "image/webp";
      messageContent = [
        {
          type: "image_url" as const,
          image_url: { url: `data:${mime};base64,${imageBase64}`, detail: "high" as const },
        },
        {
          type: "text" as const,
          text: `[input type: ${source}]\n\n${text?.trim() || "Parse this screenshot."}`,
        },
      ];
    } else {
      messageContent = `[input type: ${source}]\n\n${text}`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: messageContent },
      ],
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}");

    return NextResponse.json({
      summary: String(raw.summary ?? "Untitled capture"),
      confidence: typeof raw.confidence === "number" ? raw.confidence : 0.8,
      proposedTasks: Array.isArray(raw.proposedTasks) ? raw.proposedTasks : [],
      proposedEvents: Array.isArray(raw.proposedEvents) ? raw.proposedEvents : [],
      proposedNotes: Array.isArray(raw.proposedNotes) ? raw.proposedNotes : [],
      proposedListItems: Array.isArray(raw.proposedListItems) ? raw.proposedListItems : [],
    });
  } catch (err) {
    console.error("capture/parse error:", err);
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
