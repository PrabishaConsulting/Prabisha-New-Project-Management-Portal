// _components/client.component.tsx

"use client";

import React from "react";
import ClientTable from "./client.table";
import { AddAccountModal } from "@/components/modals/AddAccountModal";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ClientsComponentProps {
  data: any[];
}

export default function ClientsComponent({ data }: ClientsComponentProps) {
  return (
    <div className="container mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <div className={cn("flex gap-4")}>
          {/* You can now easily add buttons for both types */}
          <Link
            href="/clients/new"
            className={buttonVariants({ variant: "default" })}
          >
            <Plus/>
            Add Client
          </Link>
        </div>
      </div>
      <ClientTable data={data} />
    </div>
  );
}
