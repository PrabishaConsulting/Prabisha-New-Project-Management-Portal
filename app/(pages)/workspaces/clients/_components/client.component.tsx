// _components/client.component.tsx

"use client";

import React from "react";
import ClientTable from "./client.table";
import { AddAccountModal } from "@/components/modals/AddAccountModal";
import { cn } from "@/lib/utils";

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
          <AddAccountModal accountType="CLIENT" buttonText="Add Client" />
          <AddAccountModal accountType="INTERNAL_PRODUCT" buttonText="Add Client without Mail" />
        </div>
      </div>
      <ClientTable data={data} />
    </div>
  );
}