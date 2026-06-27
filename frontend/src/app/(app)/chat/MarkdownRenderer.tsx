import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      allowedElements={["p", "ul", "ol", "li", "h1", "h2", "h3", "code", "pre", "strong", "em", "a", "br", "hr", "blockquote", "table", "thead", "tbody", "tr", "th", "td"]}
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-1.5 list-disc pl-4">{children}</ul>,
        ol: ({ children }) => <ol className="mb-1.5 list-decimal pl-4">{children}</ol>,
        li: ({ children }) => <li className="mb-0.5">{children}</li>,
        h1: ({ children }) => <h1 className="mb-1.5 text-base font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-1 text-sm font-bold">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
        code: ({ children }) => <code className="rounded bg-black/15 px-1 py-0.5 font-mono text-xs">{children}</code>,
        pre: ({ children }) => <pre className="mb-1.5 overflow-x-auto rounded-lg bg-black/15 p-3 font-mono text-xs">{children}</pre>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => {
          const s = href?.startsWith("http://") || href?.startsWith("https://") ? href : undefined;
          return <a href={s} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: "var(--color-accent)" }}>{children}</a>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
