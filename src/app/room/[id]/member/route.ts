import { NextRequest, NextResponse } from "next/server";

const QUEUE_SERVICE_URL = process.env.QUEUE_SERVICE_URL!;

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    const res = await fetch(`${QUEUE_SERVICE_URL}/rooms/${roomId}/members`, {
      method: "GET",
      headers: {
        Authorization: req.headers.get("authorization") || "",
      },
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[proxy list members] error", error);
    return NextResponse.json(
      { message: "Error interno en el proxy" },
      { status: 500 }
    );
  }
}
