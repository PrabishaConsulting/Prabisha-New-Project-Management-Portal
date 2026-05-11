// components/attendance/AdminAttendanceDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Download, Eye, CheckCircle, XCircle, Clock, Users, Calendar as CalendarIcon } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    department?: { name: string };
  };
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
  workHours?: number;
  isLate: boolean;
  lateMinutes?: number;
  verifiedByUser?: { name: string };
  verificationNote?: string;
}

export function AdminAttendanceDashboard() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);
  const [verifyStatus, setVerifyStatus] = useState('');
  const [verifyNote, setVerifyNote] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    fetchAttendances();
  }, [selectedDate, department, status]);

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: format(selectedDate, 'yyyy-MM-dd'),
        endDate: format(selectedDate, 'yyyy-MM-dd'),
        ...(department !== 'all' && { departmentId: department }),
        ...(status !== 'all' && { status }),
      });
      
      const response = await fetch(`/api/admin/attendance?${params}`);
      const data = await response.json();
      setAttendances(data);
    } catch (error) {
      console.error('Error fetching attendances:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (attendanceId: string) => {
    try {
      const response = await fetch('/api/admin/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          attendanceId,
          status: verifyStatus,
          note: verifyNote,
        }),
      });

      if (response.ok) {
        toast.success('Attendance verified successfully');
        fetchAttendances();
        setSelectedAttendance(null);
        setVerifyStatus('');
        setVerifyNote('');
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      toast.error('Failed to verify attendance');
    }
  };

  const handleManualEntry = async (data: any) => {
    try {
      const response = await fetch('/api/admin/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual-entry',
          ...data,
        }),
      });

      if (response.ok) {
        toast.success('Manual entry added successfully');
        fetchAttendances();
      } else {
        throw new Error('Failed to add manual entry');
      }
    } catch (error) {
      toast.error('Failed to add manual entry');
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Employee', 'Department', 'Check In', 'Check Out', 'Work Hours', 'Status', 'Late Minutes', 'Verified By'];
    const csvData = attendances.map(a => [
      format(new Date(a.date), 'yyyy-MM-dd'),
      a.user.name,
      a.user.department?.name || 'N/A',
      format(new Date(a.checkInTime), 'hh:mm a'),
      a.checkOutTime ? format(new Date(a.checkOutTime), 'hh:mm a') : 'Not checked out',
      a.workHours?.toFixed(2) || '0',
      a.status,
      a.lateMinutes || '0',
      a.verifiedByUser?.name || 'Pending',
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      PRESENT: 'default',
      LATE: 'destructive',
      HALF_DAY: 'warning',
      ABSENT: 'secondary',
    };
    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Management</h2>
          <p className="text-muted-foreground">Monitor and verify employee attendance</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center space-x-2">
          <div>
            <Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manual Attendance Entry</DialogTitle>
                <DialogDescription>
                  Add or edit attendance record manually
                </DialogDescription>
              </DialogHeader>
              <ManualEntryForm onSubmit={handleManualEntry} />
            </DialogContent>
          </Dialog>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            {attendances.length} records found for {format(selectedDate, 'MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Work Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : attendances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">No records found</TableCell>
                </TableRow>
              ) : (
                attendances.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell className="font-medium">{attendance.user.name}</TableCell>
                    <TableCell>{attendance.user.department?.name || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(attendance.checkInTime), 'hh:mm a')}</TableCell>
                    <TableCell>
                      {attendance.checkOutTime 
                        ? format(new Date(attendance.checkOutTime), 'hh:mm a')
                        : 'Active'}
                    </TableCell>
                    <TableCell>{attendance.workHours?.toFixed(2) || '0'} hrs</TableCell>
                    <TableCell>{getStatusBadge(attendance.status)}</TableCell>
                    <TableCell>
                      {attendance.isLate ? `${attendance.lateMinutes} min` : 'On time'}
                    </TableCell>
                    <TableCell>
                      {attendance.verifiedByUser ? (
                        <Badge variant="outline">✓ Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedAttendance(attendance)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Verify Attendance</DialogTitle>
                            <DialogDescription>
                              Review and verify attendance for {attendance.user.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Date</Label>
                              <p className="text-sm">{format(new Date(attendance.date), 'MMMM d, yyyy')}</p>
                            </div>
                            <div>
                              <Label>Check In Time</Label>
                              <p className="text-sm">{format(new Date(attendance.checkInTime), 'hh:mm a')}</p>
                            </div>
                            <div>
                              <Label>Status</Label>
                              <Select value={verifyStatus} onValueChange={setVerifyStatus}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PRESENT">Present</SelectItem>
                                  <SelectItem value="LATE">Late</SelectItem>
                                  <SelectItem value="HALF_DAY">Half Day</SelectItem>
                                  <SelectItem value="ABSENT">Absent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Note (Optional)</Label>
                              <Textarea 
                                placeholder="Add verification notes..."
                                value={verifyNote}
                                onChange={(e) => setVerifyNote(e.target.value)}
                              />
                            </div>
                            <DialogFooter>
                              <Button onClick={() => handleVerify(attendance.id)}>
                                Verify Attendance
                              </Button>
                            </DialogFooter>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Manual Entry Form Component
function ManualEntryForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    userId: '',
    date: '',
    checkInTime: '09:00',
    checkOutTime: '17:00',
    status: 'PRESENT',
    note: '',
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Employee</Label>
        <Select value={formData.userId} onValueChange={(v) => setFormData({...formData, userId: v})}>
          <SelectTrigger>
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {/* Populate with users from your API */}
            <SelectItem value="user1">John Doe</SelectItem>
            <SelectItem value="user2">Jane Smith</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Date</Label>
        <Input 
          type="date" 
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Check In Time</Label>
          <Input 
            type="time" 
            value={formData.checkInTime}
            onChange={(e) => setFormData({...formData, checkInTime: e.target.value})}
          />
        </div>
        <div>
          <Label>Check Out Time</Label>
          <Input 
            type="time" 
            value={formData.checkOutTime}
            onChange={(e) => setFormData({...formData, checkOutTime: e.target.value})}
          />
        </div>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PRESENT">Present</SelectItem>
            <SelectItem value="LATE">Late</SelectItem>
            <SelectItem value="HALF_DAY">Half Day</SelectItem>
            <SelectItem value="ABSENT">Absent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => onSubmit(formData)} className="w-full">
        Add Record
      </Button>
    </div>
  );
}