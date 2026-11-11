import { Fragment, type ReactNode } from "react";

/** Tiny, safe Markdown renderer (headings, lists, bold, italics, code, paragraphs). No HTML injection. */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-fg">{p.slice(2, -2)}</strong>;
    if (/^(\*[^*]+\*|_[^_]+_)$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="num rounded bg-white/[0.06] px-1 py-0.5 text-[0.9em]">{p.slice(1, -1)}</code>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="space-y-3 text-[14px] leading-relaxed text-fg/85">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (!lines.length) return null;
        const h = lines[0].match(/^(#{1,4})\s+(.*)$/);
        if (h && lines.length === 1) {
          const lvl = h[1].length;
          const cls = lvl === 1 ? "text-[22px] font-semibold text-fg" : lvl === 2 ? "mt-4 text-[17px] font-semibold text-fg" : "mt-2 text-[15px] font-semibold text-fg";
          return <div key={i} className={`font-display tracking-[-0.01em] ${cls}`}>{inline(h[2])}</div>;
        }
        if (lines.length >= 2 && lines.every((l) => /^\s*\|.*\|\s*$/.test(l))) {
          const rows = lines.filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map((l) => l.trim().slice(1, -1).split("|").map((c) => c.trim()));
          const [head, ...body] = rows;
          return (
            <div key={i} className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[0.03] text-faint">
                  <tr>{head.map((c, k) => <th key={k} className="px-3 py-2 font-medium">{inline(c)}</th>)}</tr>
                </thead>
                <tbody>
                  {body.map((r, k) => (
                    <tr key={k} className="border-t border-line">{r.map((c, n) => <td key={n} className="px-3 py-2 align-top">{inline(c)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (lines.every((l) => /^\s*([-*+]|\d+\.)\s+/.test(l))) {
          const ordered = /^\s*\d+\./.test(lines[0]);
          const items = lines.map((l, k) => <li key={k}>{inline(l.replace(/^\s*([-*+]|\d+\.)\s+/, ""))}</li>);
          return ordered ? <ol key={i} className="list-decimal space-y-1 pl-5">{items}</ol> : <ul key={i} className="list-disc space-y-1 pl-5 marker:text-faint">{items}</ul>;
        }
        if (h) {
          return (
            <Fragment key={i}>
              <Markdown text={lines[0]} />
              <Markdown text={lines.slice(1).join("\n")} />
            </Fragment>
          );
        }
        return <p key={i}>{lines.map((l, k) => <Fragment key={k}>{k > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}
