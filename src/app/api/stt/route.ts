export async function POST(req: Request) {
  try {
    const audioBuffer = await req.arrayBuffer();

    const token = process.env.CHIMEGE_STT_TOKEN;

    if (!token) {
      return Response.json({ error: "Missing token" }, { status: 500 });
    }

    const uploadResponse = await fetch(
      "https://api.chimege.com/v1.2/stt-long",
      {
        method: "POST",
        body: audioBuffer,
        headers: {
          Token: token,
        },
      },
    );

    const uploadJson = await uploadResponse.json();

    const uuid = uploadJson.uuid;

    let transcript = "";

    for (let i = 0; i < 300; i++) {
      const pollResponse = await fetch(
        "https://api.chimege.com/v1.2/stt-long-transcript",
        {
          method: "GET",
          headers: {
            Token: token,
            UUID: uuid,
          },
        },
      );

      const result = await pollResponse.json();

      if (result.done) {
        transcript = result.transcription ?? "";
        break;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    return Response.json({
      text: transcript,
    });
  } catch (error) {
    console.error(error);

    return Response.json({ error: String(error) }, { status: 500 });
  }
}
