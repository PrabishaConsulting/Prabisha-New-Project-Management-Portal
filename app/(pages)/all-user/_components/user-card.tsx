// components/user-cards.tsx

"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight } from "lucide-react";

// Define the user type
type SimpleUser = {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
};

interface UserCardsProps {
  users: SimpleUser[];
}

// Framer Motion variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
};

export const UserCards = ({ users }: UserCardsProps) => {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {users.map((user) => (
        <motion.div key={user.id} variants={itemVariants} className="h-full">
          <Link href={`/all-user/${user.id}`} className="block h-full">
            <Card className="h-full flex flex-col justify-center transition-all border-2 border-transparent hover:border-primary hover:shadow-lg group min-h-[96px]">
              <CardHeader className="w-full">
                <div className="flex items-center justify-between w-full gap-4">
                  <div className="flex items-center space-x-4 min-w-0">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage
                        className="object-cover"
                        src={user.avatar || undefined}
                      />
                      <AvatarFallback>
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-lg capitalize truncate">
                        {user.name.replace(".prabisha", "")}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.role}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 flex-shrink-0" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
};