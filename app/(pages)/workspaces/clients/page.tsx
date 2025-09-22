import { db } from "@/lib/db";
import ClientsComponent from "./_components/client.component";

export default async function ClientPage() {
  const data = await db.user.findMany({
    where: {
      userType: "CLIENT",
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      createdAt: true,
    },
  });

  if (!data) return null;

  

  return (
    <main className="p-4">

      <ClientsComponent data={data}/>
    </main>
  );
}