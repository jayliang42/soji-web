import clsx from "clsx";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const allowedElements = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "input",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul"
];

const components: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  table: ({ children }) => (
    <div className="my-7 overflow-x-auto">
      <table>{children}</table>
    </div>
  )
};

export function MarkdownContent({
  className,
  content
}: {
  className?: string;
  content: string;
}) {
  return (
    <div
      className={clsx(
        "text-[1.05rem] leading-8 text-cocoa/85",
        "[&_a]:font-semibold [&_a]:text-clay [&_a]:underline [&_a]:decoration-clay/40 [&_a]:underline-offset-4 hover:[&_a]:decoration-clay",
        "[&_blockquote]:my-7 [&_blockquote]:border-l-4 [&_blockquote]:border-clay [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-cocoa/72",
        "[&_code]:rounded-sm [&_code]:bg-dune/45 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:text-cocoa",
        "[&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:leading-tight [&_h3]:text-cocoa",
        "[&_h4]:mb-2 [&_h4]:mt-7 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:text-cocoa",
        "[&_hr]:my-9 [&_hr]:border-dune",
        "[&_li+li]:mt-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-7 [&_p+p]:mt-5 [&_pre]:my-7 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-charcoal [&_pre]:p-5 [&_pre]:text-white [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-7",
        "[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-dune [&_td]:p-3 [&_th]:border [&_th]:border-dune [&_th]:bg-sand [&_th]:p-3 [&_th]:text-left [&_th]:font-bold",
        "[&_input[type=checkbox]]:mr-2 [&_input[type=checkbox]]:accent-clay",
        className
      )}
    >
      <ReactMarkdown
        allowedElements={allowedElements}
        components={components}
        remarkPlugins={[remarkGfm]}
        skipHtml
        unwrapDisallowed
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
