"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from 'date-fns';

// 1. Define a TypeScript type for your activity data for better safety.
// I've added an optional 'email' field for the Google Chat integration.
type ActivityUser = {
  name: string;
  avatar: string;
  email?: string; // <-- Add the user's email to your data for this to work
};

type Activity = {
  id: string;
  action: string;
  description: string;
  createdAt: string; // The date should be an ISO string
  user: ActivityUser;
};

// A helper function to get initials from a name for the avatar fallback
const getInitials = (name: string) => {
  const names = name.split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.slice(0, 2).toUpperCase();
};

export const LiveActivity = ({ TodaysLiveActivity }: { TodaysLiveActivity: Activity[] }) => {
  // IMPORTANT: Replace this with your actual Google Workspace ID structure if needed.
  // The standard link format is usually just the email address.
  const createGoogleChatLink = (email: string) => `https://chat.google.com/dm/${email}`;

  return (
    <Card className="h-[450px] flex flex-col">
      <CardHeader>
        <CardTitle>Live Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {/* 2. ScrollArea makes only the content below scrollable */}
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {TodaysLiveActivity.map((activity) => {
              const link = activity.user.email ? createGoogleChatLink(activity.user.email) : undefined;
              
              const ActivityItem = (
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                  <Avatar>
                    <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                    <AvatarFallback>{getInitials(activity.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    {/* 3. This renders the description with bold text */}
                    <p className="text-foreground">
                      <span className="font-semibold">{activity.user.name}</span>{' '}
                      {activity.description.replace(`${activity.user.name} `, '')}
                    </p>
                    {/* 4. User-friendly relative timestamp with a detailed tooltip */}
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

              // 5. If an email is available, wrap the item in a link to Google Chat.
              if (link) {
                return (
                  <a key={activity.id} href={link} target="_blank" rel="noopener noreferrer" className="block">
                    {ActivityItem}
                  </a>
                );
              }

              // Otherwise, render it as a simple div.
              return (
                <div key={activity.id}>
                  {ActivityItem}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};