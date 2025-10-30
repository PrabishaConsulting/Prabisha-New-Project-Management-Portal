// components/timeline/TimelineFilters.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {TimelineFilters as TimeLineFiltreData, Activity } from '@/types';
import { Filter, X } from 'lucide-react';

interface TimelineFiltersProps {
  filters: TimeLineFiltreData;
  setFilters: (filters: TimeLineFiltreData) => void;
  activities: Activity[];
}

export default function TimelineFiltersComponent({ filters, setFilters, activities }: TimelineFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Extract unique users from activities
  const uniqueUsers = Array.from(
    new Map(activities.map(activity => [activity.user.id, activity.user])).values()
  );

  const handleFilterChange = (key: keyof TimeLineFiltreData, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    setFilters({
      type: 'all',
      user: 'all',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = 
    filters.type !== 'all' || 
    filters.user !== 'all' || 
    filters.dateFrom || 
    filters.dateTo;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Activity Type</label>
              <Select 
                value={filters.type} 
                onValueChange={(value) => handleFilterChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="comment">Comments</SelectItem>
                  <SelectItem value="status_changed">Status Changes</SelectItem>
                  <SelectItem value="task_created">Tasks Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">User</label>
              <Select 
                value={filters.user} 
                onValueChange={(value) => handleFilterChange('user', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
            <Button onClick={() => setIsExpanded(false)}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}