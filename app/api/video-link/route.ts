import { NextResponse } from "next/server";
import { resolveYouTubeLink } from "@/lib/youtube-link";
export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{11}$/.test(input))
    return NextResponse.json(
      { message: "Liên kết YouTube không hợp lệ." },
      { status: 400 },
    );
  const video = await resolveYouTubeLink(input);
  return NextResponse.json({ video });
}
