import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { BackupSection } from "@/components/profile/BackupSection";

export const Route = createFileRoute("/profile/backup")({
  component: BackupPage,
});

function BackupPage() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <PageHeader
        title="Backup & Restore"
        subtitle="Keep a portable copy on your device or sync one privately to Google Drive."
        eyebrow={
          <button
            type="button"
            onClick={() => navigate({ to: "/profile" })}
            className="focus-ring -ml-2 inline-flex min-h-10 items-center gap-2 px-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Profile / System
          </button>
        }
      />

      <BackupSection />
    </AppShell>
  );
}
