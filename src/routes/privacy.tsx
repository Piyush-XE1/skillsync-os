import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/primitives";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SkillSync OS" },
      { name: "description", content: "Privacy Policy for SkillSync OS." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
            Privacy Policy
          </h1>
        </div>
      </header>

      <div className="space-y-4 px-5 pb-12 lg:px-2">
        <Card className="space-y-3 p-5 text-[13.5px] leading-relaxed text-muted-foreground">
          <p className="text-foreground font-medium">Local-first by design</p>
          <p>
            SkillSync OS stores your notes, habits, expenses, projects, roadmaps, and people
            journal locally on your device. We do not sell, rent, or share your personal data.
          </p>
          <p className="text-foreground font-medium">Google Drive Backups</p>
          <p>
            If you choose to connect Google Drive, SkillSync OS requests only the{" "}
            <code>https://www.googleapis.com/auth/drive.file</code> scope to create and update your
            encrypted backup file inside your own Google Drive. We never access other files in your
            Drive.
          </p>
          <p className="text-foreground font-medium">Contact</p>
          <p>For privacy questions, contact ydv.piyush.16@gmail.com.</p>
        </Card>
      </div>
    </AppShell>
  );
}
