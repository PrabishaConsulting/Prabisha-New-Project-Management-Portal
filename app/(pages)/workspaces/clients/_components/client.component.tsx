"use client";

import React from "react"
import ClientTable from "./client.table";
import { ClientData } from "./client.coloumn";
import { AddInternalProductModal } from "@/components/modals/AddInternalProductModal";
import { cn } from "@/lib/utils";

interface ClientsComponentProps {
  data: any[]; // Use a more specific type here
  onDataChange: () => void;
}

export default function ClientsComponent({ data, onDataChange }: ClientsComponentProps) {

  // **IMPORTANT**: Replace this with your actual data fetch.
  // This is where you would get your client list from your database.
 
  const refresh = () => {
    window.location.reload();
  }

  return (
    <div className="container mx-auto ">
      <div className="mb-6 flex justify-between items-center">

      <h1 className="text-2xl font-bold mb-6">Clients</h1>
      <div className={ cn( " flex gap-4 py-4 justify-center items-center")} >

      <AddInternalProductModal onProductAdded={refresh} name="Add Client" />
      </div>
      </div>
      <ClientTable data={data} onDataChange={onDataChange} />
    </div>
  );
}