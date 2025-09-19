// app/(pages)/all-task/_components/status-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatusCardProps = {
  total: number;
  todo: number;
  inProgress: number;
  inReview: number;
  completed: number;
};

export default function StatusCard({
  total,
  todo,
  inProgress,
  inReview,
  completed,
}: StatusCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle>Today's Total Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{total}</p>
        </CardContent>
      </Card>

      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle>Today's To Do</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-yellow-600">{todo}</p>
        </CardContent>
      </Card>
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle>Today's In Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-yellow-600">{inProgress}</p>
        </CardContent>
      </Card>

      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle>Today's In Review</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-blue-600">{inReview}</p>
        </CardContent>
      </Card>

      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle>Today's Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">{completed}</p>
        </CardContent>
      </Card>
    </div>
  );
}
