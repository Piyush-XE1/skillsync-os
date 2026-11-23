import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/primitives";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — SkillSync OS" },
      { name: "description", content: "Terms of Service for SkillSync OS." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-3 px-5 pt-1 lg:px-2">
        <Link
          to="/profile"
          className="glass flex h-11 w-11 items-center justify-center rounded-[5px] active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Legal</div>
          <h1 className="font-editorial truncate text-[26px] font-normal leading-tight tracking-[-0.03em]">
            Terms of Service
          </h1>
        </div>
      </header>

      <div className="space-y-4 px-5 pb-12 lg:px-2">
        <Card className="space-y-3 p-5 text-[13.5px] leading-relaxed text-muted-foreground">
          <p className="text-foreground font-medium">Use of SkillSync OS</p>
          <p>
            SkillSync OS is provided as a personal, local-first productivity and learning workspace.
            You retain full ownership of all data you create and store in the app.
          </p>
          <p className="text-foreground font-medium">Backups &amp; Data Responsibility</p>
          <p>
            Because your data is stored locally on your device, you are responsible for maintaining
            backups (locally or via your connected Google Drive account).
          </p>
          <p className="text-foreground font-medium">Contact</p>
          <p>For questions, contact ydv.piyush.16@gmail.com.</p>
        </Card>
      </div>
    </AppShell>
  );
}
