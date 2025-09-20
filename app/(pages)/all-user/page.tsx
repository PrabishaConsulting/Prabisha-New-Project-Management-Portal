import { db } from "@/lib/db"; // Your Prisma client instance
import { UsersClient } from "./_components/users-client";

// Define a simple type for the user data we'll pass to the client
export type SimpleUser = {
  id: string;
  name: string;
  avatar: string | null;
  role: string; // Assuming 'role' is a field on your User model
};

// This is an async Server Component
export default async function UsersListPage() {
  // 1. Fetch all internal users from the database
  const users = await db.user.findMany({
    where: {
      userType: "INTERNAL", // Or any other filter you need
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // 2. Pass the fetched data to the client component for rendering
  return <UsersClient users={users} />;
}