'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Timer } from 'lucide-react';
import { type TimeEntry } from '@prisma/client';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

// The parent component will now pass a client-safe entry type
type ClientTimeEntry = Omit<TimeEntry, 'date' | 'createdAt' | 'updatedAt'> & {
  date: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string | null; avatar: string | null };
}

interface TimeTrackingProps {
  taskId: string;
  initialTotalMinutes: number;
  timeEntries: ClientTimeEntry[];
  onTimeLog: (newEntry: ClientTimeEntry, newTotalMinutes: number) => void;
}

// Format seconds to MM:SS (minutes and seconds)
const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Format minutes to a readable string (e.g., "120 minutes" or "1.5 hours")
const formatMinutes = (totalMinutes: number) => {
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  } else {
    const hours = totalMinutes / 60;
    if (Number.isInteger(hours)) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours.toFixed(1)} hours`;
    }
  }
};

export function TimeTracking({ taskId, initialTotalMinutes, timeEntries, onTimeLog }: TimeTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimerState = localStorage.getItem(`timer-state-${taskId}`);
    if (savedTimerState) {
      try {
        const { isTracking: savedIsTracking, startTime: savedStartTime, elapsedTime: savedElapsedTime } = JSON.parse(savedTimerState);
        
        if (savedIsTracking && savedStartTime) {
          // If timer was running, calculate the elapsed time since then
          const now = Date.now();
          const elapsedSinceSaved = Math.floor((now - savedStartTime) / 1000);
          setElapsedTime(savedElapsedTime + elapsedSinceSaved);
          setStartTime(now - (elapsedSinceSaved * 1000));
          setIsTracking(true);
        } else {
          // If timer was paused, just restore the elapsed time
          setElapsedTime(savedElapsedTime);
        }
      } catch (error) {
        console.error('Failed to parse saved timer state:', error);
      }
    }
  }, [taskId]);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    const timerState = {
      isTracking,
      startTime: isTracking ? Date.now() : null,
      elapsedTime: isTracking ? 0 : elapsedTime
    };
    localStorage.setItem(`timer-state-${taskId}`, JSON.stringify(timerState));
  }, [isTracking, startTime, elapsedTime, taskId]);

  // Timer interval effect
  useEffect(() => {
    if (isTracking && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTracking, startTime]);

  const logTime = async (secondsToLog: number) => {
    if (secondsToLog < 60) { // Changed from 1 second to 60 seconds (1 minute)
      toast.info("Timer stopped.", { description: "Not enough time was tracked to create a log." });
      return;
    }
    
    const minutesToLog = Math.floor(secondsToLog / 60); // Convert seconds to minutes

    try {
      const response = await fetch(`/api/tasks/${taskId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: minutesToLog, date: new Date().toISOString() }),
      });
      
      if (!response.ok) throw new Error('Failed to log time entry.');
      
      const { newTimeEntry, actualMinutes } = await response.json();
      onTimeLog(newTimeEntry, actualMinutes);
      toast.success('Time logged successfully!');

    } catch (error) {
      toast.error('Failed to log time', { description: (error as Error).message });
    }
  };

  const handleToggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      logTime(elapsedTime);
      // Don't reset elapsed time immediately, keep it visible until the component re-renders with new data
    } else {
      setIsTracking(true);
      setStartTime(Date.now());
    }
  };

  // Calculate total minutes including current session
  const currentSessionMinutes = Math.floor(elapsedTime / 60);
  const totalMinutes = initialTotalMinutes + currentSessionMinutes;

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Time Tracking</h3>
          <Button onClick={handleToggleTracking} size="sm" variant={isTracking ? 'destructive' : 'default'}>
            {isTracking ? <Square className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isTracking ? 'Stop' : 'Start'}
          </Button>
      </div>
      <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Timer className="h-5 w-5" />
            <span>Total time spent</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-semibold text-foreground">
              {formatTime(elapsedTime)}
            </span>
            <p className="text-xs text-muted-foreground">
              {formatMinutes(totalMinutes)} total
            </p>
          </div>
      </div>
      {isTracking && (
        <p className="text-xs text-center text-muted-foreground mt-2">
          Currently tracking time... Current session: {formatTime(elapsedTime)} ({Math.floor(elapsedTime / 60)} minute{Math.floor(elapsedTime / 60) !== 1 ? 's' : ''})
        </p>
      )}

      <div className="mt-4 space-y-3">
        {timeEntries.map(entry => (
            <div key={entry.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage className='object-cover' src={entry.user.avatar || ''} />
                        <AvatarFallback>{entry.user.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">{entry.user.name} logged time</span>
                </div>
                <div className="text-right">
                    <p className="font-semibold">{formatMinutes(entry.minutes)}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(entry.date), { addSuffix: true })}</p>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}