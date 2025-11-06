
import { db } from "@/lib/db";
import Ably from "ably";

const ably = new Ably.Realtime(process.env.NEXT_PUBLIC_ABLY_KEY!);
const channel = ably.channels.get("notifications");

export async function createAndBroadcastNotification({
  type,
  message,
  url,
  recipients,
}: {
  type: string;
  message: string;
  url?: string;
  recipients: string[];
}) {
  if (!recipients.length) return null;

  // 1️⃣ Save in DB
  const notification = await db.notification.create({
    data: {
      type,
      message,
      url,
      recipients: {
        create: recipients.map((recipientId) => ({
          recipientId,
        })),
      },
    },
    include: { recipients: true },
  });

  // 2️⃣ Broadcast via Ably
  channel.publish("new-notification", {
    id: notification.id,
    type,
    message,
    url,
    recipients,
    createdAt: notification.createdAt,
  });

  return notification;
}

/** Mark all notifications as read for a given user */
export async function markNotificationsAsRead(userId: string) {
  await db.notificationRecipient.updateMany({
    where: { recipientId: userId, status: "UNREAD" },
    data: { status: "READ", readAt: new Date() },
  });
}

/** Fetch all notifications for a user */
export async function getUserNotifications(userId: string) {
  const results = await db.notificationRecipient.findMany({
    where: { recipientId: userId },
    include: { notification: true },
    orderBy: { notification: { createdAt: "desc" } },
  });

  return results.map((n) => ({
    id: n.notification.id,
    type: n.notification.type,
    message: n.notification.message,
    url: n.notification.url,
    createdAt: n.notification.createdAt,
    status: n.status,
  }));
}
