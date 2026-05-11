// components/attendance/UserAttendanceButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Coffee, LogIn, LogOut, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AttendanceData {
  id: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
  workHours?: number;
  isLate: boolean;
  lateMinutes?: number;
  breaks: Break[];
}

interface Break {
  id: string;
  startTime: string;
  endTime?: string;
  type: string;
  duration?: number;
}

export function UserAttendanceButton() {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [breakType, setBreakType] = useState('BREAK');
  const [breakNote, setBreakNote] = useState('');
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await fetch(`/api/attendance?startDate=${today}&endDate=${today}`);
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        setAttendance(data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.display_name || `${lat}, ${lng}`;
    } catch (error) {
      return `${lat}, ${lng}`;
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      // Get location if requested
      let locationData = null;
      if (showLocationDialog) {
        try {
          const position = await getCurrentLocation();
          const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
          locationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address,
          };
        } catch (error) {
          toast.error('Failed to get location. Check-in will proceed without location data.');
        }
      }

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkin',
          note: breakNote,
          location: locationData,
          ipAddress: await fetchIP(),
          deviceInfo: navigator.userAgent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAttendance(data.data);
        toast.success(`You checked in at ${format(new Date(), 'hh:mm a')}`);
        setShowLocationDialog(false);
        setBreakNote('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to check in');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Failed to check in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          note: breakNote,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAttendance(data.data);
        toast.success(`You worked for ${data.data.workHours?.toFixed(2)} hours today`);
        setBreakNote('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to check out');
      }
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error('Failed to check out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBreak = async (action: 'start' | 'end') => {
    setLoading(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'break',
          breakAction: action,
          type: breakType,
          note: breakNote,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchTodayAttendance();
        toast.success(`Break ${action === 'start' ? 'started' : 'ended'} successfully`);
        setShowBreakDialog(false);
        setBreakNote('');
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${action === 'start' ? 'start' : 'end'} break`);
      }
    } catch (error) {
      console.error('Break error:', error);
      toast.error(`Failed to ${action === 'start' ? 'start' : 'end'} break. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const fetchIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return undefined;
    }
  };

  const isCheckedIn = attendance && !attendance.checkOutTime;
  const isCheckedOut = attendance?.checkOutTime;
  const hasActiveBreak = attendance?.breaks?.some(b => !b.endTime);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Attendance</span>
          {attendance && (
            <Badge variant={attendance.isLate ? 'destructive' : 'default'}>
              {attendance.status}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Mark your attendance for today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attendance ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Check In:</span>
              </div>
              <span className="font-medium">
                {format(new Date(attendance.checkInTime), 'hh:mm a')}
              </span>
            </div>
            
            {attendance.checkOutTime && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Check Out:</span>
                </div>
                <span className="font-medium">
                  {format(new Date(attendance.checkOutTime), 'hh:mm a')}
                </span>
              </div>
            )}

            {attendance.workHours && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Work Hours:</span>
                </div>
                <span className="font-medium">{attendance.workHours.toFixed(2)} hrs</span>
              </div>
            )}

            {attendance.isLate && attendance.lateMinutes && (
              <div className="flex items-center justify-between text-sm text-destructive">
                <span>Late by:</span>
                <span className="font-medium">{attendance.lateMinutes} minutes</span>
              </div>
            )}

            {/* Break Controls */}
            {isCheckedIn && !isCheckedOut && (
              <div className="pt-2">
                {hasActiveBreak ? (
                  <Button 
                    onClick={() => handleBreak('end')} 
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    <Coffee className="mr-2 h-4 w-4" />
                    End Break
                  </Button>
                ) : (
                  <Dialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Coffee className="mr-2 h-4 w-4" />
                        Start Break
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Start Break</DialogTitle>
                        <DialogDescription>
                          Take a break from work
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Break Type</Label>
                          <Select value={breakType} onValueChange={setBreakType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LUNCH">Lunch</SelectItem>
                              <SelectItem value="BREAK">Short Break</SelectItem>
                              <SelectItem value="MEETING">Meeting</SelectItem>
                              <SelectItem value="TRAINING">Training</SelectItem>
                              <SelectItem value="PERSONAL">Personal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Note (Optional)</Label>
                          <Textarea 
                            placeholder="Add a note about your break..."
                            value={breakNote}
                            onChange={(e) => setBreakNote(e.target.value)}
                          />
                        </div>
                        <Button onClick={() => handleBreak('start')} disabled={loading}>
                          Start Break
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </div>
        ) : (
          <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <LogIn className="mr-2 h-4 w-4" />
                Check In
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Check In</DialogTitle>
                <DialogDescription>
                  Record your attendance for today
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Note (Optional)</Label>
                  <Textarea 
                    placeholder="Add a note about your day..."
                    value={breakNote}
                    onChange={(e) => setBreakNote(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">
                    Location will be recorded for verification
                  </span>
                </div>
                <Button onClick={handleCheckIn} disabled={loading}>
                  Confirm Check In
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Check Out Button */}
        {isCheckedIn && !isCheckedOut && !hasActiveBreak && (
          <Button 
            onClick={handleCheckOut} 
            disabled={loading}
            variant="secondary"
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Check Out
          </Button>
        )}
      </CardContent>
    </Card>
  );
}