// app/our-product/page.tsx

import { db } from "@/lib/db";
import { ProductClient } from "./_components/client";
import { columns } from "./_components/columns";
import { revalidatePath } from "next/cache";

// Explicitly mark this page as dynamic
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

interface OurProductPageProps {
  searchParams: Promise <{
    page?: string;
  }>;
}

export default async function OurProductPage({ searchParams }: OurProductPageProps) {

  const searchServer = await searchParams

  // Your existing code is correct
  const page = Number(searchServer.page) || 1;

  const [products, totalProducts] = await Promise.all([
    db.products.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.products.count(),
  ]);

  const pageCount = Math.ceil(totalProducts / PAGE_SIZE);

    async function refreshData() {
    'use server';
    revalidatePath('/our-product');
  }


  return (
    <div className="p-4 md:p-6">
      <ProductClient
        initialData={products}
        columns={columns}
        pageCount={pageCount}
                onDataChange={refreshData}

      />
    </div>
  );
}