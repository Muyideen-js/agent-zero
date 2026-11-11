import { NextResponse } from "next/server";
import { aiConfigured, aiModel } from "@/lib/ai/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: aiConfigured(), model: aiConfigured() ? aiModel() : undefined });
}
