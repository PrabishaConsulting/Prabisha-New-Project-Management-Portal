// components/attendance/LeaveManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CalendarIcon, CheckCircle, XCircle, Clock } from 'lucide-react';

interface LeaveRequest {
  id: string;
  user: { name: string; email: string };
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  halfDay: boolean;
  halfDaySession?: string;
  createdAt: string;
  approver?: { name: string };
}

export function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/attendance/leave?all=true&status=PENDING');
      const data = await response.json();
      setLeaveRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (leaveId: string, status: string) => {
    try {
      const response = await fetch('/api/attendance/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveId,
          status,
          rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
        }),
      });

      if (response.ok) {
        toast.success(`Leave request ${status.toLowerCase()} successfully`);
        fetchLeaveRequests();
        setSelectedLeave(null);
        setRejectionReason('');
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      toast.error('Error updating leave request status');
      console.error('Error updating leave request status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      case 'CANCELLED': return 'secondary';
      default: return 'default';
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      ANNUAL: 'Annual Leave',
      SICK: 'Sick Leave',
      CASUAL: 'Casual Leave',
      UNPAID: 'Unpaid Leave',
      MATERNITY: 'Maternity Leave',
      PATERNITY: 'Paternity Leave',
      BEREAVEMENT: 'Bereavement',
      STUDY: 'Study Leave',
      OTHER: 'Other',
    };
    return types[type] || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Requests</CardTitle>
        <CardDescription>Review and manage employee leave requests</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : leaveRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">No pending leave requests</TableCell>
              </TableRow>
            ) : (
              leaveRequests.map((request) => {
                const startDate = new Date(request.startDate);
                const endDate = new Date(request.endDate);
                const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                
                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.user.name}</TableCell>
                    <TableCell>{getLeaveTypeLabel(request.type)}</TableCell>
                    <TableCell>
                      {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {request.halfDay ? `${days * 0.5} day` : `${days} day${days > 1 ? 's' : ''}`}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(request.status) as any}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(request.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedLeave(request)}
                          >
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Review Leave Request</DialogTitle>
                            <DialogDescription>
                              Review and take action on leave request
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Employee</Label>
                              <p className="text-sm font-medium">{request.user.name}</p>
                              <p className="text-xs text-muted-foreground">{request.user.email}</p>
                            </div>
                            <div>
                              <Label>Leave Type</Label>
                              <p className="text-sm">{getLeaveTypeLabel(request.type)}</p>
                            </div>
                            <div>
                              <Label>Duration</Label>
                              <p className="text-sm">
                                {format(startDate, 'MMMM d, yyyy')} - {format(endDate, 'MMMM d, yyyy')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {request.halfDay 
                                  ? `${days * 0.5} day (${request.halfDaySession} session)`
                                  : `${days} day${days > 1 ? 's' : ''}`}
                              </p>
                            </div>
                            <div>
                              <Label>Reason</Label>
                              <p className="text-sm">{request.reason}</p>
                            </div>
                            {request.status === 'REJECTED' && request.rejectionReason && (
                              <div>
                                <Label>Rejection Reason</Label>
                                <p className="text-sm text-destructive">{request.rejectionReason}</p>
                              </div>
                            )}
                            {request.status === 'PENDING' && (
                              <>
                                <div>
                                  <Label>Rejection Reason (if rejecting)</Label>
                                  <Textarea 
                                    placeholder="Enter reason for rejection..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                  />
                                </div>
                                <DialogFooter className="gap-2">
                                  <Button
                                    variant="default"
                                    onClick={() => handleUpdateStatus(request.id, 'APPROVED')}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleUpdateStatus(request.id, 'REJECTED')}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </Button>
                                </DialogFooter>
                              </>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
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