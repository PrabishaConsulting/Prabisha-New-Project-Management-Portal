import { Badge } from "@/components/ui/badge";
import type { AssetStatus, LiveStatus } from "@prisma/client";

// The 'Status' type now correctly includes all possible enum values
type Status = AssetStatus | LiveStatus;

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  // A comprehensive map of all possible statuses to their styles
  const statusStyles: Record<Status, { variant: "default" | "destructive" | "secondary", className?: string, text: string }> = {
    // Asset Statuses
    ACTIVE: { variant: "default", className: "bg-green-500 hover:bg-green-600 border-green-600", text: "Active" },
    EXPIRED: { variant: "destructive", text: "Expired" },
    PENDING_RENEWAL: { variant: "default", className: "bg-yellow-500 hover:bg-yellow-600 border-yellow-600", text: "Pending" },
    
    // Live Statuses
    ONLINE: { variant: "default", className: "bg-green-500 hover:bg-green-600 border-green-600", text: "Online" },
    OFFLINE: { variant: "destructive", text: "Offline" },
    UNKNOWN: { variant: "secondary", text: "Unknown" },

    // --- New Badges Added Here ---
    SSL_ERROR: { 
      variant: "default", 
      className: "bg-orange-500 hover:bg-orange-600 border-orange-600 text-white", 
      text: "SSL Error" 
    },
 
    INVALID_DOMAIN: { 
      variant: "secondary", 
      className: "bg-gray-400 hover:bg-gray-500 border-gray-500 text-white",
      text: "Invalid Domain" 
    },
  };

  // Fallback to UNKNOWN if a status is ever not found in the map
  const style = statusStyles[status] || statusStyles.UNKNOWN;

  return (
    <Badge variant={style.variant} className={style.className}>
      {style.text}
    </Badge>
  );
}