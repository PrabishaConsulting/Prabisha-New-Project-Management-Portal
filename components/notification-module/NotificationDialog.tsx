// components/NotificationPopover.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { Bell, CheckCheck, X, CheckCircle, AlertCircle, Circle } from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

// Ably
import Ably, { RealtimeChannel, Realtime } from "ably";

// Types
type NotificationData = {
  recipients: any;
  id: string;
  type: string;
  message: string;
  url?: string;
  createdAt: string;
  status: "READ" | "UNREAD";
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

// --- Sub-component for a single notification item ---

const NotificationItem = ({ n, onMarkAsRead }: { n: NotificationData; onMarkAsRead: (id: string) => void }) => {
  const isUnread = n.status === "UNREAD";

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(n.id);
    }
    if (n.url) {
      window.open(n.url, "_blank");
    }
  };

  const actorName = n.message.split(" ")[0];
  const actionMessage = n.message.substring(actorName.length).trim();

  return (
    <div
      className={`
        flex items-start gap-3 p-3 mb-4 rounded-md cursor-pointer transition-colors group
        ${isUnread ? "notification-unread" : "notification-read"}
      `}
      onClick={handleClick}
    >
      <div className="relative">
        <Avatar className="h-9 w-9">
          
          <AvatarFallback className="text-xs">{actorName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        {isUnread && <Circle className="absolute -bottom-1 -right-1 h-3 w-3 fill-blue-500 text-blue-500" />}
      </div>
      <div className="grid gap-1 flex-1">
        <p className={`text-sm ${isUnread ? "font-semibold" : "font-medium"}`}>
          <span className="font-bold">{actorName}</span> {actionMessage}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(n.createdAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      {isUnread && (
        <Badge variant="secondary" className="text-[10px] h-5 opacity-0 group-hover:opacity-100 transition-opacity">
          New
        </Badge>
      )}
    </div>
  );
};
export function NotificationPopover({ userId }: { userId: string }) {
  const ablyRef = useRef<Realtime | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Permission States
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const {
    data: notifications = [],
    mutate: mutateNotifications,
    isLoading,
  } = useSWR<NotificationData[]>("/api/notifications", fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: true,
  });

  const unreadNotifications = notifications.filter((n) => n.status === "UNREAD");
  const unreadCount = unreadNotifications.length;

  // --- Actions ---
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setShowPermissionAlert(false);
      setPermissionGranted(true);
      // Show success message and auto-hide it
      setTimeout(() => setPermissionGranted(false), 5000);
      new Notification("Notifications Enabled! 🎉", {
        body: "You'll now receive real-time updates.",
        icon: "/favicon.ico",
      });
    } else if (permission === "denied") {
      setPermissionDenied(true);
      setShowPermissionAlert(false);
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    mutateNotifications();
  };

  const markAsRead = async (id: string) => {
    // Assuming you have an endpoint to mark a single notification as read
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    mutateNotifications();
  };

  // --- Effects ---
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "default") setShowPermissionAlert(true);
      else if (Notification.permission === "denied") setPermissionDenied(true);
    }
  }, []);

  // Ably Effect (remains the same)
  useEffect(() => {
    if (ablyRef.current) return;
    const ably = new Ably.Realtime({ key: process.env.NEXT_PUBLIC_ABLY_KEY!, echoMessages: false });
    ablyRef.current = ably;
    const channel = ably.channels.get("notifications");
    channelRef.current = channel;

    channel.subscribe("new-notification", (msg) => {
      const data = msg.data as NotificationData;
      if (data.recipients?.includes(userId)) {
        mutate("/api/notifications", (current: NotificationData[] = []) => [data, ...current], false);
        if (Notification.permission === "granted") {
          new Notification(data.type || "New Notification", { body: data.message, icon: "/favicon.ico" });
        }
      }
    });

    return () => {
      if (channelRef.current) channelRef.current.unsubscribe();
      if (ablyRef.current) ablyRef.current.close();
      ablyRef.current = null;
      channelRef.current = null;
    };
  }, [userId, mutate]);

  return (
    <>
      {/* --- SUCCESS ALERT --- */}
      {permissionGranted && (
        <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle className="text-green-800">Notifications Enabled</AlertTitle>
          <AlertDescription className="text-green-700">
            You're all set! You will receive real-time updates.
          </AlertDescription>
        </Alert>
      )}

      {/* --- PERMISSION PROMPT ALERT --- */}
      {showPermissionAlert && (
        <Alert className="mb-4">
          <Bell className="h-4 w-4" />
          <AlertTitle>Enable Notifications</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">Stay updated with real-time notifications.</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={requestNotificationPermission}>Enable</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPermissionAlert(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* --- PERMISSION DENIED ALERT --- */}
      {permissionDenied && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Notifications Blocked</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">Please enable them in your browser settings to stay updated.</span>
            <Button size="sm" variant="outline" onClick={() => setPermissionDenied(false)}>
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* --- NOTIFICATION POPOVER --- */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full relative">
            <Bell className="size-[18px]" />
            {unreadCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-[10px] flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-96 p-0" alignOffset={10}>
          <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold leading-none">Notifications</h4>
              {unreadCount > 0 && <Badge variant="secondary">{unreadCount} new</Badge>}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <Separator />
          <ScrollArea className="h-96 p-2">
            {isLoading ? (
              <p className="text-sm text-center py-4 text-muted-foreground">Loading...</p>
            ) : notifications.length > 0 ? (
              notifications.map((n) => <NotificationItem key={n.id} n={n} onMarkAsRead={markAsRead} />)
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <CheckCheck className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </>
  );
}