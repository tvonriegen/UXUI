import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** AI Chat is intentionally unavailable during the stabilization release. */
export async function POST() {
  return NextResponse.json(
    { error: "El asistente IA no está disponible en este release." },
    { status: 503 },
  );
}
