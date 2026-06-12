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

    // Chimege only allows: Cyrillic letters, spaces, ? ! . , : - ' "
    // Normalize Unicode punctuation → ASCII equivalents, then strip anything else
    let ttsText: string = (text as string)
      .replace(/…/g, "...") // … → ...
      .replace(/[‘’‚‛]/g, "'") // curly single quotes → '
      .replace(/[“”„‟]/g, '"') // curly double quotes → "
      .replace(/[–—―]/g, "-") // en/em dash → -
      .replace(/[*_`#~>]/g, "")
      .replace(/\(https?:\/\/[^\)]*\)/g, "")
      .replace(/[^Ѐ-ӿ\s?!.,:\-'"]/g, "") // strip non-Cyrillic non-allowed
      .replace(/\s+/g, " ")
      .trim();

    // Truncate at a sentence boundary within 500 chars
    const MAX_CHARS = 280; // Chimege limit is 300 normalized chars — stay safely under
    if (ttsText.length > MAX_CHARS) {
      const cut = ttsText.slice(0, MAX_CHARS);
      const last = Math.max(
        cut.lastIndexOf("。"),
        cut.lastIndexOf("．"),
        cut.lastIndexOf("."),
        cut.lastIndexOf("!"),
        cut.lastIndexOf("?"),
        cut.lastIndexOf("…"),
      );
      ttsText = last > 100 ? cut.slice(0, last + 1) : cut;
    }

    if (!ttsText) {
      return NextResponse.json(
        { error: "Empty text after cleaning" },
        { status: 400 },
      );
    }

    console.log(
      "[tts] sending to Chimege, length:",
      ttsText.length,
      "preview:",
      ttsText.slice(0, 60),
    );

    const response = await fetch("https://api.chimege.com/v1.2/synthesize", {
      method: "POST",
      headers: {
        Token: token,
        "Content-Type": "text/plain; charset=utf-8",
        "voice-id": voice || "FEMALE3v2",
      },
      body: ttsText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[tts] Chimege",
        response.status,
        errorText,
        "| text:",
        ttsText.slice(0, 80),
      );
      return NextResponse.json(
        { error: errorText, status: response.status },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: { "Content-Type": "audio/wav" },
    });
  } catch (error) {
    console.error("[tts] caught error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
