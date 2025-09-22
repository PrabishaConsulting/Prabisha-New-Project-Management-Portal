// components/user-table.tsx

"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, FileDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import export libraries
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Define the user type
type SimpleUser = {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
};

interface UserTableProps {
  users: SimpleUser[];
}

export const UserTable = ({ users }: UserTableProps) => {
  // Handler for exporting data to Excel
  const handleExportToExcel = () => {
    const dataToExport = users.map((user) => ({
      Name: user.name.replace(".prabisha", ""),
      Role: user.role,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Team Members");
    XLSX.writeFile(workbook, "Team_Members.xlsx");
  };

  // Handler for exporting data to PDF
  const handleExportToPDF = () => {
    const doc = new jsPDF();
    const tableData = users.map((user) => [
      user.name.replace(".prabisha", ""),
      user.role,
    ]);

    autoTable(doc, {
      head: [["Name", "Role"]],
      body: tableData,
    });

    doc.save("Team_Members.pdf");
  };

  return (
    <div className="mt-8">
      {/* --- EXPORT BUTTONS ADDED HERE --- */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button onClick={handleExportToExcel} variant="outline" size="sm">
          <FileDown className="mr-2 h-4 w-4" /> Export Excel
        </Button>
        <Button onClick={handleExportToPDF} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
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
                    <span className="font-medium capitalize">
                      {user.name.replace(".prabisha", "")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.role}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="icon">
                    <Link href={`/all-user/${user.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};