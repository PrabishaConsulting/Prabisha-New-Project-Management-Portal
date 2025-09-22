// app/page.tsx
"use client"
import DomainDashboard from '@/components/assets/DomainDashboard';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import AssetsPageComponent from './_components/assets';
export default function HomePage() {
    const router = useRouter();
  return (
    <main className="container mx-auto p-4 md:p-8">
      {/* Section for adding a new domain */}
      {/* <section className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Add New Domain
        </h1>
        <p className="text-muted-foreground mb-6">
          Fill out the form below to add a new asset to your tracker.
        </p>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <NewAssetForm />
        </div>
      </section> */}
      
      {/* Section for displaying the domain dashboard */}
      <section>
        <div className=' flex justify-between'>

        <h2 className="text-3xl font-bold tracking-tight mb-6">
          Domain Dashboard
        </h2>
        <Button onClick={()=> router.push('/assets/create')} variant={'default'} size={'lg'}>Add New Asset </Button>
        </div>
        <AssetsPageComponent/>
      </section>
    </main>
  );
}