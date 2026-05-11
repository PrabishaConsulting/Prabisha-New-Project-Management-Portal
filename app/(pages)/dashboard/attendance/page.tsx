// app/dashboard/attendance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAttendanceButton } from './_components/UserAttendanceButton';
import { AdminAttendanceDashboard } from './_components/AdminAttendanceDashboard';
import { LeaveManagement } from './_components/LeaveManagement';
import { ApplyLeaveDialog } from './_components/ApplyLeaveDialog';
import { useSession } from 'next-auth/react';
import {
  CalendarProvider,
  CalendarDate,
  CalendarMonthPicker,
  CalendarYearPicker,
  CalendarDatePagination,
  CalendarHeader,
  CalendarBody,
  CalendarItem,
  type Feature,
  type Status,
  useCalendarMonth,
  useCalendarYear,
} from '@/components/extra/big-calendar';
import { format } from 'date-fns';

// Attendance status colors mapping
const attendanceStatusColors: Record<string, Status> = {
  PRESENT: { id: 'present', name: 'Present', color: '#22c55e' },
  LATE: { id: 'late', name: 'Late', color: '#ef4444' },
  HALF_DAY: { id: 'half-day', name: 'Half Day', color: '#f59e0b' },
  ABSENT: { id: 'absent', name: 'Absent', color: '#6b7280' },
  ON_LEAVE: { id: 'on-leave', name: 'On Leave', color: '#8b5cf6' },
  WEEKEND: { id: 'weekend', name: 'Weekend', color: '#9ca3af' },
  HOLIDAY: { id: 'holiday', name: 'Holiday', color: '#06b6d4' },
};

// Extended Feature type for attendance
interface AttendanceFeature extends Feature {
  type: 'attendance' | 'leave' | 'holiday';
  attendanceId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  workHours?: number;
}

export default function AttendancePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';
  const [attendances, setAttendances] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendarData = async (month: number, year: number) => {
    setLoading(true);
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      // Fetch attendance data
      const attendanceRes = await fetch(
        `/api/attendance?startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${format(endDate, 'yyyy-MM-dd')}`
      );
      const attendanceData = await attendanceRes.json();
      setAttendances(attendanceData.data || []);
      
      // Fetch leave requests (approved ones for calendar)
      const leaveRes = await fetch(`/api/attendance/leave?status=APPROVED`);
      const leaveData = await leaveRes.json();
      setLeaveRequests(leaveData.requests || []);
      
      // Fetch holidays
      const holidayRes = await fetch(`/api/holidays?year=${year}`);
      const holidayData = await holidayRes.json();
      setHolidays(holidayData || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const todayAttendance = attendances.find(a => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return format(new Date(a.date), 'yyyy-MM-dd') === today;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance & Leaves</h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Manage employee attendance, leaves, and track patterns" 
              : "Track your attendance, apply for leaves, and view holidays"}
          </p>
        </div>
        <div className="flex gap-2">
          <ApplyLeaveDialog onSuccess={() => fetchCalendarData(new Date().getMonth(), new Date().getFullYear())} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <UserAttendanceButton />
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status Today</span>
                <Badge variant={todayAttendance ? (todayAttendance.isLate ? 'destructive' : 'default') : 'outline'}>
                  {todayAttendance ? todayAttendance.status : 'Not Checked In'}
                </Badge>
              </div>
              {todayAttendance?.workHours && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Work Hours Today</span>
                  <span className="font-medium">{todayAttendance.workHours.toFixed(2)}h</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Business Hours</span>
                <span className="font-medium text-primary">9 AM - 5 PM IST</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="calendar" className="space-y-4">
            <TabsList>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              {isAdmin && <TabsTrigger value="all-attendance">All Attendance</TabsTrigger>}
              {isAdmin && <TabsTrigger value="approvals">Leave Approvals</TabsTrigger>}
              <TabsTrigger value="my-history">My History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="calendar" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Calendar</CardTitle>
                  <CardDescription>
                    {isAdmin 
                      ? "View all employee attendance, leaves, and holidays" 
                      : "View your attendance history, approved leaves, and company holidays"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CalendarView 
                    attendances={attendances}
                    leaveRequests={leaveRequests}
                    holidays={holidays}
                    onMonthChange={fetchCalendarData}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {isAdmin && (
              <>
                <TabsContent value="all-attendance" className="space-y-4">
                  <AdminAttendanceDashboard />
                </TabsContent>
                
                <TabsContent value="approvals" className="space-y-4">
                  <LeaveManagement />
                </TabsContent>
              </>
            )}
            
            <TabsContent value="my-history" className="space-y-4">
              <UserLeaveHistory />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// User Leave History Component
function UserLeaveHistory() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyLeaves = async () => {
      try {
        const res = await fetch('/api/attendance/leave');
        const data = await res.json();
        setRequests(data.requests || []);
      } catch (error) {
        console.error('Error fetching my leaves:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyLeaves();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      case 'CANCELLED': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Leave Requests</CardTitle>
        <CardDescription>Track the status of your leave applications</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No leave requests found</TableCell>
              </TableRow>
            ) : (
              requests.map((request) => {
                const start = new Date(request.startDate);
                const end = new Date(request.endDate);
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.type}</TableCell>
                    <TableCell>{format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}</TableCell>
                    <TableCell>{request.halfDay ? '0.5' : days}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(request.status) as any}>{request.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Calendar View Component
function CalendarView({ 
  attendances, 
  leaveRequests, 
  holidays, 
  onMonthChange 
}: { 
  attendances: any[]; 
  leaveRequests: any[]; 
  holidays: any[];
  onMonthChange: (month: number, year: number) => void;
}) {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();

  useEffect(() => {
    onMonthChange(month, year);
  }, [month, year]);

  // Convert attendances to calendar features
  const features: AttendanceFeature[] = [
    ...attendances.map(attendance => ({
      id: attendance.id,
      name: `${attendance.user?.name || 'Unknown'} - ${attendance.status}`,
      startAt: new Date(attendance.checkInTime),
      endAt: new Date(attendance.date),
      status: attendanceStatusColors[attendance.status] || attendanceStatusColors.ABSENT,
      type: 'attendance' as const,
      attendanceId: attendance.id,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      workHours: attendance.workHours,
    })),
    ...leaveRequests.map(leave => ({
      id: leave.id,
      name: `${leave.user?.name} - ${leave.type} Leave`,
      startAt: new Date(leave.startDate),
      endAt: new Date(leave.endDate),
      status: { 
        id: 'leave', 
        name: 'Leave', 
        color: '#8b5cf6' 
      },
      type: 'leave' as const,
    })),
    ...holidays.map(holiday => ({
      id: holiday.id,
      name: holiday.name,
      startAt: new Date(holiday.date),
      endAt: new Date(holiday.date),
      status: { 
        id: 'holiday', 
        name: 'Holiday', 
        color: '#06b6d4' 
      },
      type: 'holiday' as const,
    })),
  ];

  return (
    <CalendarProvider className="h-[800px]">
      <CalendarDate>
        <CalendarMonthPicker />
        <CalendarYearPicker start={2020} end={2030} />
        <CalendarDatePagination />
      </CalendarDate>
      <CalendarHeader />
      <CalendarBody features={features}>
        {({ feature }) => {
          const attendanceFeature = feature as AttendanceFeature;
          return (
            <div className="group relative">
              <CalendarItem feature={feature} />
              {/* Tooltip on hover for more details */}
              {attendanceFeature.type === 'attendance' && attendanceFeature.workHours && (
                <div className="absolute left-0 top-full z-10 mt-1 hidden rounded-md bg-popover p-2 text-xs shadow-md group-hover:block">
                  <div>Work Hours: {attendanceFeature.workHours.toFixed(2)}h</div>
                  {attendanceFeature.checkInTime && (
                    <div>Check In: {format(new Date(attendanceFeature.checkInTime), 'hh:mm a')}</div>
                  )}
                  {attendanceFeature.checkOutTime && (
                    <div>Check Out: {format(new Date(attendanceFeature.checkOutTime), 'hh:mm a')}</div>
                  )}
                </div>
              )}
            </div>
          );
        }}
      </CalendarBody>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 border-t pt-4">
        <div className="text-sm font-medium">Legend:</div>
        {Object.entries(attendanceStatusColors).map(([key, status]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
            <span className="text-xs">{status.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
          <span className="text-xs">Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#06b6d4' }} />
          <span className="text-xs">Holiday</span>
        </div>
      </div>
    </CalendarProvider>
  );
}