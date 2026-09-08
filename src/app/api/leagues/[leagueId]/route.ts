import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { deleteLeague, LeagueError } from "@/lib/leagueService";

export async function DELETE(request: Request, { params }: { params: { leagueId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Bitte zuerst einloggen" }, { status: 401 });

  try {
    await deleteLeague(params.leagueId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof LeagueError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
