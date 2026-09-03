import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { startNewSeason, LeagueError } from "@/lib/leagueService";

export async function POST(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  try {
    const { newSeason } = await startNewSeason(params.leagueId, userId);
    return NextResponse.json({ ok: true, newSeason });
  } catch (err) {
    if (err instanceof LeagueError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
