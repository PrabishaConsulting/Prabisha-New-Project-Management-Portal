"use client";
import { useSearchParams } from "next/navigation";
import { UserTaskDetailChart } from "./user-task-detail-chart";
import { PendingTasksChart } from "./pending-task-by-user-chart";

export function DashboardWrapper({ departments }: { departments: any[] }) {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const rawUserName = searchParams.get("userName");

  // --- CHANGE: Add a regex to validate the userName ---
  // This regex allows only letters, numbers, spaces, hyphens, underscores, and periods.
  const safeNameRegex = /^[a-zA-Z0-9\s\-_.]+$/;

  // Use the validated name, or fall back to the placeholder
  const userName =
    rawUserName && safeNameRegex.test(rawUserName)
      ? rawUserName
      : "Selected User";

  return (
    <div className="container mx-auto">
      {userId ? (
        <UserTaskDetailChart userId={userId} userName={userName} />
      ) : (
        <PendingTasksChart departments={departments} />
      )}
    </div>
  );
}
