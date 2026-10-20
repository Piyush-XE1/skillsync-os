import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Strikethrough,
  type LucideIcon,
} from "lucide-react";
import type { MarkdownFormat } from "@/lib/notes";

const TOOLS: Array<{
  format: MarkdownFormat;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}> = [
  { format: "heading-1", label: "Heading 1", icon: Heading1 },
  { format: "heading-2", label: "Heading 2", icon: Heading2 },
  { format: "bold", label: "Bold", icon: Bold, shortcut: "Ctrl+B" },
  { format: "italic", label: "Italic", icon: Italic, shortcut: "Ctrl+I" },
  { format: "strike", label: "Strikethrough", icon: Strikethrough },
  { format: "link", label: "Link", icon: Link2, shortcut: "Ctrl+K" },
  { format: "bullet", label: "Bulleted list", icon: List },
  { format: "numbered", label: "Numbered list", icon: ListOrdered },
  { format: "task", label: "Task list", icon: ListTodo },
  { format: "quote", label: "Block quote", icon: Quote },
  { format: "code", label: "Code", icon: Code2 },
  { format: "divider", label: "Divider", icon: Minus },
];

export function MarkdownToolbar({
  onFormat,
  disabled = false,
}: {
  onFormat: (format: MarkdownFormat) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="note-format-toolbar"
      role="toolbar"
      aria-label="Markdown formatting"
      aria-orientation="horizontal"
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
        ];
        const current = buttons.indexOf(event.target as HTMLButtonElement);
        if (current < 0 || buttons.length === 0) return;
        event.preventDefault();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}
    >
      {TOOLS.map(({ format, label, icon: Icon, shortcut }, index) => (
        <button
          key={format}
          type="button"
          className="focus-ring note-format-button"
          disabled={disabled}
          aria-label={shortcut ? `${label}, ${shortcut}` : label}
          title={shortcut ? `${label} (${shortcut})` : label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onFormat(format)}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
          {index === 1 || index === 5 || index === 8 || index === 10 ? (
            <span className="note-toolbar-divider" aria-hidden="true" />
          ) : null}
        </button>
      ))}
    </div>
  );
}
