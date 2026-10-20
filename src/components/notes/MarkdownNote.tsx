import { Children, isValidElement, memo, useDeferredValue, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Note } from "@/lib/schema";
import { resolveWikiLinks, slugifyHeading } from "@/lib/notes";
import { cn } from "@/lib/utils";

function textFromNode(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: ReactNode }>(child))
        return textFromNode(child.props.children);
      return "";
    })
    .join("");
}

type MarkdownNoteProps = {
  body: string;
  notes?: Note[];
  className?: string;
  emptyMessage?: string;
  onToggleTask?: (taskIndex: number, done: boolean) => void;
};

/** Keep keystrokes urgent while the Markdown parser catches up in preview mode. */
export function MarkdownNote(props: MarkdownNoteProps) {
  const deferredBody = useDeferredValue(props.body);
  return <MarkdownDocument {...props} body={deferredBody} />;
}

const MarkdownDocument = memo(function MarkdownDocument({
  body,
  notes = [],
  className,
  emptyMessage = "This note does not have any writing yet.",
  onToggleTask,
}: MarkdownNoteProps) {
  if (!body.trim()) {
    return <p className="note-empty-copy">{emptyMessage}</p>;
  }

  const headingCounts = new Map<string, number>();
  const heading = (level: 1 | 2 | 3 | 4): NonNullable<Components[`h${typeof level}`]> => {
    const Heading = `h${level}` as const;
    return ({ children }) => {
      const base = slugifyHeading(textFromNode(children));
      const count = headingCounts.get(base) ?? 0;
      headingCounts.set(base, count + 1);
      const id = count ? `${base}-${count + 1}` : base;
      return (
        <Heading id={id}>
          <a href={`#${id}`} className="note-heading-anchor" tabIndex={-1} aria-hidden="true">
            #
          </a>
          {children}
        </Heading>
      );
    };
  };

  let taskIndex = -1;
  const components: Components = {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    a: ({ href = "", children, ...props }) => {
      const external = /^https?:\/\//i.test(href);
      return (
        <a {...props} href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
          {children}
          {external && <span className="sr-only"> (opens in a new tab)</span>}
        </a>
      );
    },
    img: ({ alt = "", src = "" }) => (
      <a href={src} target="_blank" rel="noreferrer" className="note-image-link">
        {alt || "Open linked image"}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ),
    table: ({ children, ...props }) => (
      <div className="note-table-scroll" tabIndex={0} aria-label="Scrollable table">
        <table {...props}>{children}</table>
      </div>
    ),
    input: ({ type, checked, ...props }) => {
      if (type !== "checkbox") return <input {...props} type={type} />;
      taskIndex += 1;
      const index = taskIndex;
      return (
        <input
          {...props}
          type="checkbox"
          checked={Boolean(checked)}
          disabled={!onToggleTask}
          aria-label={checked ? "Mark task incomplete" : "Mark task complete"}
          onChange={(event) => onToggleTask?.(index, event.target.checked)}
        />
      );
    },
  };

  return (
    <article className={cn("note-prose", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {resolveWikiLinks(body, notes)}
      </ReactMarkdown>
    </article>
  );
});
