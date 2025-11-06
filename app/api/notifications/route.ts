import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getUserNotifications, markNotificationsAsRead } from "@/services/notification-service/notification.service";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await getUserNotifications(session.user.id);
  return NextResponse.json(notifications);
}

export async function PATCH() {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await markNotificationsAsRead(session.user.id);
  return NextResponse.json({ success: true });
}
