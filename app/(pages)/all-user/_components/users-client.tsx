// app/all-user/users-client.tsx  (or your main page file)

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCards } from "./user-card";
import { UserTable } from "./user-table";
import { motion } from "framer-motion";

// Define the user type (can also be imported from a central types file)
type SimpleUser = {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
};

interface UsersClientProps {
  users: SimpleUser[];
}

export const UsersClient = ({ users }: UsersClientProps) => {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Meet the Team</h1>
        <p className="text-muted-foreground mt-2">
          Click on any user to view their detailed performance dashboard.
        </p>
      </motion.div>

      <Tabs defaultValue="cards" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>
        <TabsContent value="cards">
          {/* Pass the users data to the Card component */}
          <UserCards users={users} />
        </TabsContent>
        <TabsContent value="table">
          {/* Pass the same users data to the Table component */}
          <UserTable users={users} />
        </TabsContent>
      </Tabs>
    </div>
  );
};