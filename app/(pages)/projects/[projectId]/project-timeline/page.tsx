// app/[projectId]/page.tsx
'use client'; // Add this directive to make it a client component

import { useState } from 'react';
import { useParams } from 'next/navigation'; // Import useParams hook
import { TimelineFilters } from '@/types';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useProjectTimeline } from '@/hooks/useProjectTimeline';
import Header from '../_components/timeline/layout/Header';
import StatsCardsTimeline from '../_components/timeline/layout/StatsCards';
import { Spinner } from '@/components/ui/spinner';
import TimelineFiltersComponent from '../_components/timeline/TimelineFilters';
import Timeline from '../_components/timeline/Timeline';

export default function ProjectTimeline() {
  // Use useParams to get the projectId from the URL
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { activities, stats, isLoading, isError, mutate } = useProjectTimeline(projectId);
  const [filters, setFilters] = useState<TimelineFilters>({
    type: 'all',
    user: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const handleRefresh = () => {
    mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Header />
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Header />
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Error loading project data</h2>
          <p className="text-muted-foreground mb-4">
            Please try again later or contact support
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // If we don't have activities or stats, we can show a not found page
  if (!activities || !stats) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Header onRefresh={handleRefresh} />
      <div className=" mb-4">
        <StatsCardsTimeline stats={stats} />
       
      </div>
      <TimelineFiltersComponent 
        filters={filters} 
        setFilters={setFilters} 
        activities={activities} 
      />
      <Timeline activities={activities} filters={filters} />
    </div>
  );
}