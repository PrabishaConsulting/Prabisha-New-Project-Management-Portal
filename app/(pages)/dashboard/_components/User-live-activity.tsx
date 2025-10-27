"use client";

import useSWRInfinite from 'swr/infinite';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, AlertCircle, MessageSquare } from "lucide-react";

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

// Skeleton loader component
const ActivitySkeleton = () => (
  <div className="flex items-start gap-3 p-2 rounded-lg">
    <div className="animate-pulse bg-gray-200 rounded-full h-10 w-10"></div>
    <div className="flex-1 space-y-2">
      <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
      <div className="animate-pulse bg-gray-200 h-3 rounded w-1/2"></div>
    </div>
  </div>
);

export const LiveActivity = ({ initialActivities }: { initialActivities: Activity[] }) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newActivitiesCount, setNewActivitiesCount] = useState(0);
  const lastActivityTime = useRef(initialActivities.length > 0 ? initialActivities[0].createdAt : null);

  const fetcher = async (url: string): Promise<{ data: Activity[], pagination: any }> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }
    return response.json();
  };

  const getKey = (pageIndex: number, previousPageData: { data: Activity[], pagination: any } | null) => {
    if (pageIndex === 0) return `/api/activities?skip=0&take=${PAGE_SIZE}`;
    
    if (!previousPageData || !previousPageData.pagination.hasMore) {
      return null;
    }
    
    const skip = pageIndex * PAGE_SIZE;
    return `/api/activities?skip=${skip}&take=${PAGE_SIZE}`;
  };

  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<{ data: Activity[], pagination: any }>(
    getKey,
    fetcher,
    {
      initialSize: 1,
      revalidateFirstPage: false,
      refreshInterval: 30000, // Auto-refresh every 30 seconds
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 3000);
      },
    }
  );

  // Check for new activities on refresh
  useEffect(() => {
    if (data && data.length > 0 && data[0].data.length > 0 && lastActivityTime.current) {
      const newestActivity = data[0].data[0];
      if (new Date(newestActivity.createdAt) > new Date(lastActivityTime.current)) {
        setNewActivitiesCount(prev => prev + 1);
      }
    }
  }, [data]);

  // Initialize with the provided initial activities
  useEffect(() => {
    if (data && data.length === 1 && data[0].data.length === 0) {
      mutate([{ 
        data: initialActivities, 
        pagination: { 
          hasMore: initialActivities.length >= PAGE_SIZE 
        } 
      }], false);
    }
  }, [data, initialActivities, mutate]);

  const activities = data ? data.flatMap(page => page.data) : initialActivities;
  const hasMore = data ? data[data.length - 1]?.pagination.hasMore : initialActivities.length >= PAGE_SIZE;
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

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setNewActivitiesCount(0);
    if (activities.length > 0) {
      lastActivityTime.current = activities[0].createdAt;
    }
    setIsRefreshing(false);
  }, [mutate, activities]);

  // Load more function
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isValidating && !isLoadingMore) {
      setIsLoadingMore(true);
      setSize(size + 1).then(() => {
        setIsLoadingMore(false);
      });
    }
  }, [hasMore, isValidating, isLoadingMore, size, setSize]);

  if (error) {
    return (
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Live Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">Error loading activities: {error.message}</div>
            <Button onClick={() => setSize(1)} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[620px] flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Live Activity</CardTitle>
          <div className="flex items-center gap-2">
            {newActivitiesCount > 0 && (
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                {newActivitiesCount} new activities
              </Button>
            )}
            <Button 
              onClick={handleRefresh} 
              variant="ghost" 
              size="sm"
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Showing {activities.length} activities {hasMore && "(more available)"}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="bg-muted rounded-full p-4 mb-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No activities yet</h3>
                <p className="text-muted-foreground mt-1">
                  When team members perform actions, they'll appear here.
                </p>
              </div>
            ) : (
              activities.map((activity, index) => {
                const link = activity.user.email ? createGoogleChatLink(activity.user.email) : undefined;
                const isPageBoundary = index > 0 && index % PAGE_SIZE === 0;
                
                const ActivityItem = (
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    <Avatar>
                      <AvatarImage loading='lazy' className='object-cover' src={activity.user.avatar} alt={activity.user.name} />
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
              })
            )}
            
            {/* Sentinel element for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />
            
            {/* Loading indicator */}
            {(isValidating || isLoadingMore) && (
              <div className="flex justify-center py-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
            
            {/* Load more button */}
            {hasMore && !isValidating && !isLoadingMore && (
              <div className="flex justify-center py-2">
                <Button onClick={handleLoadMore} variant="outline" size="sm">
                  Load more
                </Button>
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