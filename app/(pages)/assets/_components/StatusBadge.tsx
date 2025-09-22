// components/StatusBadge.tsx

import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string | null | undefined;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (!status) {
    return <Badge variant="secondary">Unknown</Badge>;
  }

  // Normalize the status for consistent capitalization and spacing
  const formattedStatus = status.replace(/_/g, " ").toUpperCase();

  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "UP":
      // A custom green badge for positive statuses
      return (
        <Badge className="border-transparent bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400">
          {formattedStatus}
        </Badge>
      );

    case "EXPIRED":
    case "DOWN":
      // The built-in destructive (red) badge
      return <Badge variant="destructive">{formattedStatus}</Badge>;

    case "PENDING":
    case "WARNING":
      // A custom yellow badge for warning statuses
      return (
        <Badge className="border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400">
          {formattedStatus}
        </Badge>
      );

    default:
      // The default secondary badge for any other status
      return <Badge variant="secondary">{formattedStatus}</Badge>;
  }
};