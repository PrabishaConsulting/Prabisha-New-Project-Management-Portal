"use client";

import useSWRInfinite from 'swr/infinite';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from "react";

// Types remain the same
type ActivityUser = {
  name: string;
  avatar: string;
  email?: string;
};

type Activity = {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: ActivityUser;
};

const getInitials = (name: string) => {
  const names = name.split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.slice(0, 2).toUpperCase();
};

const PAGE_SIZE = 20;

export const LiveActivity = ({ initialActivities }: { initialActivities: Activity[] }) => {
  // State to track if we're loading more
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // SWR fetcher function with proper typing
  const fetcher = async (url: string): Promise<{ data: Activity[], pagination: any }> => {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }
    return response.json();
  };

  // Function to generate SWR key based on page index
  const getKey = (pageIndex: number, previousPageData: { data: Activity[], pagination: any } | null) => {
    // For the first page, we use the initial data
    if (pageIndex === 0) return `/api/activities?skip=0&take=${PAGE_SIZE}`;
    
    // If there's no previous page data or no more pages, return null
    if (!previousPageData || !previousPageData.pagination.hasMore) {
      return null;
    }
    
    // Calculate skip for next page
    const skip = pageIndex * PAGE_SIZE;
    return `/api/activities?skip=${skip}&take=${PAGE_SIZE}`;
  };

  // Use SWR infinite hook with proper typing
  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<{ data: Activity[], pagination: any }>(
    getKey,
    fetcher,
    {
      initialSize: 1,
      revalidateFirstPage: false,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 3000);
      },
    }
  );

  // Initialize with the provided initial activities
  useEffect(() => {
    if (data && data.length === 1 && data[0].data.length === 0) {
      // If the first page is empty, replace it with initial data
      mutate([{ 
        data: initialActivities, 
        pagination: { 
          hasMore: initialActivities.length >= PAGE_SIZE 
        } 
      }], false);
    }
  }, [data, initialActivities, mutate]);

  // Flatten all pages
  const activities = data ? data.flatMap(page => page.data) : initialActivities;
  
  // Check if there's more data to load
  const hasMore = data ? data[data.length - 1]?.pagination.hasMore : initialActivities.length >= PAGE_SIZE;

  // Sentinel ref for intersection observer
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isValidating && !isLoadingMore) {
          setIsLoadingMore(true);
          setSize(size + 1).then(() => {
            setIsLoadingMore(false);
          });
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [hasMore, isValidating, size, setSize, isLoadingMore]);

  const createGoogleChatLink = (email: string) => `https://chat.google.com/dm/${email}`;

  if (error) {
    return (
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Live Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <div className="text-center text-red-500">
            Error loading activities: {error.message}
            <button 
              onClick={() => setSize(1)} 
              className="mt-2 px-4 py-2 bg-primary text-white rounded-md"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[620px] flex flex-col">
      <CardHeader>
        <CardTitle>Live Activity</CardTitle>
        <div className="text-xs text-muted-foreground">
          Showing {activities.length} activities {hasMore && "(more available)"}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const link = activity.user.email ? createGoogleChatLink(activity.user.email) : undefined;
              const isPageBoundary = index > 0 && index % PAGE_SIZE === 0;
              
              const ActivityItem = (
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                  <Avatar>
                    <AvatarImage loading='lazy' className=' object-cover' src={activity.user.avatar} alt={activity.user.name} />
                    <AvatarFallback>{getInitials(activity.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="text-foreground">
                      <span className="font-semibold">{activity.user.name}</span>{' '}
                      {activity.description.replace(`${activity.user.name} `, '')}
                    </p>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger>
                          <p className="text-xs text-muted-foreground mt-1 cursor-default">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{new Date(activity.createdAt).toLocaleString()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );

              return (
                <div key={activity.id}>
                  {isPageBoundary && (
                    <div className="text-center text-xs text-muted-foreground my-2">
                      Page {Math.floor(index / PAGE_SIZE) + 1}
                    </div>
                  )}
                  {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="block">
                      {ActivityItem}
                    </a>
                  ) : (
                    <div>
                      {ActivityItem}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Sentinel element for infinite scroll - always show if there might be more */}
            <div ref={sentinelRef} className="h-1" />
            
            {/* Loading indicator */}
            {(isValidating || isLoadingMore) && (
              <div className="flex justify-center py-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
            
            {/* End of list message */}
            {!hasMore && activities.length > 0 && (
              <div className="text-center text-sm text-muted-foreground py-2">
                No more activities for today
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};