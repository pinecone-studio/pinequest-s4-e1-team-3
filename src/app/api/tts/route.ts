import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, voice } = await req.json();

    const token = process.env.CHIMEGE_TTS_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Missing CHIMEGE_TTS_TOKEN" },
        { status: 500 },
      );
    }

    const response = await fetch("https://api.chimege.com/v1.2/synthesize", {
      method: "POST",
      headers: {
        Token: token,
        "Content-Type": "text/plain",
        "voice-id": voice || "FEMALE3v2",
      },
      body: text,
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: errorText,
          status: response.status,
        },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/x-wav",
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
