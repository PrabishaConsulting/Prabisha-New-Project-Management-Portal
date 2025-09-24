// app/(pages)/workspaces/clients/page.tsx

import { db } from "@/lib/db";
import ClientsComponent from "./_components/client.component";

export const dynamic = 'force-dynamic'; // Ensures the page is always fresh

export default async function ClientPage() {
  const [clients, internalProducts] = await Promise.all([
    db.user.findMany({
      where: { userType: "CLIENT" },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        location: true,
        industry: true,
        createdAt: true,
      },
    }),
    db.internalProduct.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        industry: true,
        createdAt: true,
      },
    }),
  ]);

  // Transform data to include a type identifier
  const clientsWithType = clients.map(c => ({ ...c, __type: 'CLIENT' as const }));
  const productsWithType = internalProducts.map(p => ({ ...p, avatar: null, __type: 'INTERNAL_PRODUCT' as const }));
  
  // Merge and sort
  const combinedData = [...clientsWithType, ...productsWithType];
  combinedData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());



  return (
    <main className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight"> Accounts List</h1>
        <p className="text-muted-foreground mt-1">
          A combined list of all clients and internal products.
        </p>
      </div>
      <ClientsComponent data={combinedData}  />
    </main>
  );
}