import ClientTable from "./client.table";
import { ClientData } from "./client.coloumn";
export default function ClientsComponent({data}: {data: ClientData[]}) {

  // **IMPORTANT**: Replace this with your actual data fetch.
  // This is where you would get your client list from your database.
 

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Clients</h1>
      <ClientTable data={data} />
    </div>
  );
}