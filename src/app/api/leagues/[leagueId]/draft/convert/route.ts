import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { convertToAssigned, DraftError } from "@/lib/draftService";

export async function POST(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  try {
    await convertToAssigned(params.leagueId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DraftError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
