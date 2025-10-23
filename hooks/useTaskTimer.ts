"use client";

import { useEffect, useState, useCallback } from "react";

interface TaskTimer {
  taskId: string;
  isRunning: boolean;
  isPaused: boolean;
  totalElapsed: number;
  currentSessionStart: number | null;
  pausedAt: number | null;
  taskTitle?: string;
}

interface TimersState {
  [taskId: string]: TaskTimer;
}

export function useTaskTimer() {
  const [timers, setTimers] = useState<TimersState>({});
  const [displayTime, setDisplayTime] = useState<{ [taskId: string]: number }>({});

  // Format time helper - defined first
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Load timers from localStorage on mount
  useEffect(() => {
    const savedTimers = localStorage.getItem("taskTimers");
    if (savedTimers) {
      try {
        const parsed: TimersState = JSON.parse(savedTimers);
        const now = Date.now();
        
        const updatedTimers: TimersState = {};
        Object.keys(parsed).forEach((taskId) => {
          const timer = parsed[taskId];
          
          if (timer.isRunning && timer.currentSessionStart) {
            const sessionElapsed = Math.floor((now - timer.currentSessionStart) / 1000);
            updatedTimers[taskId] = {
              ...timer,
              currentSessionStart: now,
              totalElapsed: timer.totalElapsed + sessionElapsed,
            };
          } else {
            updatedTimers[taskId] = timer;
          }
        });
        
        setTimers(updatedTimers);
      } catch (error) {
        console.error("Error loading timers:", error);
      }
    }
  }, []);

  // Save timers to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(timers).length > 0) {
      localStorage.setItem("taskTimers", JSON.stringify(timers));
    }
  }, [timers]);

  // Update display time for running timers AND browser title
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newDisplayTimes: { [taskId: string]: number } = {};
      let activeTimer: ActiveTimer | null = null;
      
      Object.keys(timers).forEach((taskId) => {
        const timer = timers[taskId];
        if (timer.isRunning && timer.currentSessionStart) {
          const currentSessionElapsed = Math.floor((now - timer.currentSessionStart) / 1000);
          const totalTime = timer.totalElapsed + currentSessionElapsed;
          newDisplayTimes[taskId] = totalTime;
          
          // Track the first active timer for browser title
          if (!activeTimer) {
            activeTimer = {
              time: totalTime,
              title: timer.taskTitle || "Task"
            };
          }
        } else {
          newDisplayTimes[taskId] = timer.totalElapsed;
        }
      });
      
      setDisplayTime(newDisplayTimes);
      
      // Update browser title

    }, 1000);

    return () => {
      clearInterval(interval);
      // Reset title on cleanup
      document.title = "Task Manager";
    };
  }, [timers, formatTime]);

  const startTimer = useCallback((taskId: string, taskTitle?: string) => {
    const now = Date.now();
    
    setTimers((prev) => {
      const existingTimer = prev[taskId];
      
      if (existingTimer && existingTimer.isPaused) {
        return {
          ...prev,
          [taskId]: {
            ...existingTimer,
            isRunning: true,
            isPaused: false,
            currentSessionStart: now,
            pausedAt: null,
            taskTitle: taskTitle || existingTimer.taskTitle,
          },
        };
      } else {
        return {
          ...prev,
          [taskId]: {
            taskId,
            isRunning: true,
            isPaused: false,
            totalElapsed: 0,
            currentSessionStart: now,
            pausedAt: null,
            taskTitle,
          },
        };
      }
    });
  }, []);

  const pauseTimer = useCallback((taskId: string) => {
    const now = Date.now();
    
    setTimers((prev) => {
      const timer = prev[taskId];
      if (!timer || !timer.isRunning) return prev;
      
      const sessionElapsed = Math.floor((now - timer.currentSessionStart!) / 1000);
      
      return {
        ...prev,
        [taskId]: {
          ...timer,
          isRunning: false,
          isPaused: true,
          totalElapsed: timer.totalElapsed + sessionElapsed,
          currentSessionStart: null,
          pausedAt: now,
        },
      };
    });
  }, []);

  const resumeTimer = useCallback((taskId: string) => {
    const now = Date.now();
    
    setTimers((prev) => {
      const timer = prev[taskId];
      if (!timer || !timer.isPaused) return prev;
      
      return {
        ...prev,
        [taskId]: {
          ...timer,
          isRunning: true,
          isPaused: false,
          currentSessionStart: now,
          pausedAt: null,
        },
      };
    });
  }, []);

  const stopTimer = useCallback(async (taskId: string): Promise<number> => {
    const timer = timers[taskId];
    if (!timer) return 0;
    
    const now = Date.now();
    let finalElapsed = timer.totalElapsed;
    
    if (timer.isRunning && timer.currentSessionStart) {
      const sessionElapsed = Math.floor((now - timer.currentSessionStart) / 1000);
      finalElapsed += sessionElapsed;
    }
    
    // Convert seconds to minutes (rounded)
    const finalMinutes = Math.round(finalElapsed / 60);
    
    // Save to backend if there's actual time logged
    if (finalMinutes > 0) {
      try {
        await fetch(`/api/tasks/${taskId}/time-entry`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            minutes: finalMinutes,
            description: `Timer session: ${timer.taskTitle || "Task"}`,
          }),
        });
      } catch (error) {
        console.error("Failed to save time entry:", error);
        // Still remove timer from state even if API call fails
      }
    }
    
    setTimers((prev) => {
      const newTimers = { ...prev };
      delete newTimers[taskId];
      return newTimers;
    });
    
    return finalElapsed;
  }, [timers]);

  const getTimerForTask = useCallback((taskId: string) => {
    return timers[taskId] || null;
  }, [timers]);

  const getDisplayTimeForTask = useCallback((taskId: string) => {
    return displayTime[taskId] || 0;
  }, [displayTime]);

  const hasActiveTimer = useCallback((taskId: string) => {
    const timer = timers[taskId];
    return timer && (timer.isRunning || timer.isPaused);
  }, [timers]);

  return {
    timers,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatTime,
    getTimerForTask,
    getDisplayTimeForTask,
    hasActiveTimer,
  };
}


interface ActiveTimer {
  time: number;
  title: string;
}