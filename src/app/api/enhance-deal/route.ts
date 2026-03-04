import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Claude API key not configured" },
      { status: 503 }
    );
  }

  const { extractedData, feedback } = await req.json();

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `Given this extracted restaurant data:
${JSON.stringify(extractedData, null, 2)}

And this user feedback: "${feedback}"

Please update and improve the data based on the feedback. Return ONLY the updated JSON with the same structure (including deal_highlight and category_emoji fields), incorporating the user's corrections and suggestions.

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Claude API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    let responseText = data.content[0].text;
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const updated = JSON.parse(responseText);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Enhance deal error:", error);
    return NextResponse.json(
      { error: "Failed to process feedback" },
      { status: 500 }
    );
  }
}
