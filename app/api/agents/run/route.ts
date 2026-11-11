import { NextResponse } from "next/server";
import { aiConfigured, aiModel, chat, parseJson } from "@/lib/ai/llm";
import { SYSTEM } from "@/lib/ai/prompts";
import type { AgentRole } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Runs one specialist on one task and returns its deliverable. */
export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Add AI_API_KEY to .env.local." }, { status: 400 });
  const b = (await req.json().catch(() => null)) as {
    role?: AgentRole; company?: string; mission?: string; title?: string; description?: string; context?: string; minimumPrice?: number;
  } | null;
  const role = b?.role;
  if (!role || !["research", "product", "sales", "finance"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const user = [
    `Company: ${b?.company ?? ""}`,
    `Mission: ${String(b?.mission ?? "").slice(0, 600)}`,
    `Task: ${String(b?.title ?? "").slice(0, 200)}`,
    `Details: ${String(b?.description ?? "").slice(0, 600)}`,
    role === "sales" ? `Minimum price: ${Number(b?.minimumPrice ?? 5)} NEAR` : "",
    b?.context ? `\nInput from earlier tasks:\n${String(b.context).slice(0, 7000)}` : "",
  ].filter(Boolean).join("\n");

  try {
    if (role === "sales") {
      const listing = parseJson<{ title: string; tagline: string; description: string; price: number; priceRationale: string; launchPosts: string[] }>(
        await chat(SYSTEM.sales, user, { json: true, maxTokens: 1200 }),
      );
      // Enforce the price floor regardless of what the model proposed.
      listing.price = Math.max(Number(listing.price) || 0, Number(b?.minimumPrice ?? 5));
      const content = `# ${listing.title}\n\n_${listing.tagline}_\n\n${listing.description}\n\n**Price:** ${listing.price} NEAR\n\n**Why this price:** ${listing.priceRationale}\n\n## Launch posts\n\n${(listing.launchPosts ?? []).map((p) => `- ${p}`).join("\n")}\n`;
      return NextResponse.json({ content, listing, summary: `Listing ready at ${listing.price} NEAR`, model: aiModel() });
    }
    const content = await chat(SYSTEM[role], user, { maxTokens: role === "product" ? 3200 : 1800 });
    const words = content.split(/\s+/).length;
    const sources = (content.match(/^\s*[-*\d.]+\s.*$/gm) ?? []).length;
    const summary = role === "research" ? `Research brief · ${words} words` : role === "product" ? `Market report · ${words} words` : `Finance report · ${words} words`;
    return NextResponse.json({ content, summary, words, sources, model: aiModel() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
