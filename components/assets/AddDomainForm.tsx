'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssetType, RenewalPeriod, AssetStatus, LiveStatus } from '@/app/generated/client';

// shadcn/ui imports
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { z } from 'zod';

const addAssetSchema = z.object({
  assetType: z.enum(Object.values(AssetType) as [string, ...string[]]),
  provider: z.string().min(1, { message: 'Provider is required.' }),
  name: z.string().min(2, { message: 'Asset name is required.' }),
  
  // Technical Details
  domainName: z.string().optional(),
  ipAddress: z.string().optional(),
  hostingPlan: z.string().optional(),
  serverLocation: z.string().optional(),
  
  // Dates
  purchaseDate: z.date({ error: 'Purchase date is required.' }),
  expiryDate: z.date({ error: 'Expiry date is required.' }),
  autoRenew: z.boolean(),
  renewalPeriod: z.enum(Object.values(RenewalPeriod) as [string, ...string[]]),
  
  // Status
  status: z.enum(Object.values(AssetStatus) as [string, ...string[]]),
  liveStatus: z.enum(Object.values(LiveStatus) as [string, ...string[]]),
  
  // Access
  controlPanelUrl: z.string().url().optional().or(z.literal('')),
  username: z.string().optional(),
  password: z.string().optional(),
  notes: z.string().optional(),
});

// Define the type based on the schema
type AddAssetInput = z.infer<typeof addAssetSchema>;

export default function NewAssetForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddAssetInput>({
    resolver: zodResolver(addAssetSchema),
    defaultValues: {
      assetType: AssetType.DOMAIN,
      provider: 'TVMServer',
      name: '',
      domainName: '',
      ipAddress: '',
      hostingPlan: '',
      serverLocation: '',
      purchaseDate: undefined,
      expiryDate: undefined,
      autoRenew: false,
      renewalPeriod: RenewalPeriod.YEARLY,
      status: AssetStatus.ACTIVE,
      liveStatus: LiveStatus.UNKNOWN,
      controlPanelUrl: '',
      username: '',
      password: '',
      notes: '',
    },
  });

  async function onSubmit(values: AddAssetInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error('Failed to create asset');
      form.reset();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const assetType = form.watch('assetType');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Asset Type */}
        <FormField
          control={form.control}
          name="assetType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(AssetType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Provider & Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., GoDaddy, AWS, TVMServer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., My Company Domain" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Service ID & Description */}
      
        {/* Technical Details - Conditional Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Technical Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Domain Name - Show for DOMAIN and SSL */}
            {(assetType === AssetType.DOMAIN || assetType === AssetType.SSL || assetType === AssetType.HOSTING) && (
              <FormField
                control={form.control}
                name="domainName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* IP Address - Show for VPS and HOSTING */}
            {(assetType === AssetType.VPS || assetType === AssetType.HOSTING) && (
              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 192.168.0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Hosting Plan - Show for HOSTING and VPS */}
            {(assetType === AssetType.HOSTING || assetType === AssetType.VPS) && (
              <FormField
                control={form.control}
                name="hostingPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hosting Plan</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Basic, Pro, Enterprise" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Server Location - Show for VPS and HOSTING */}
            {(assetType === AssetType.VPS || assetType === AssetType.HOSTING) && (
              <FormField
                control={form.control}
                name="serverLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Server Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., New York, USA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Dates & Renewal</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="renewalPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Renewal Period</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select renewal period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(RenewalPeriod).map((period) => (
                        <SelectItem key={period} value={period}>
                          {period.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoRenew"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Auto Renew</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Automatically renew this asset
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(AssetStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="liveStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Live Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select live status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(LiveStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Access Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Access Information</h3>
          
          <FormField
            control={form.control}
            name="controlPanelUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Control Panel URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://cp.example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Login username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Login password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Any additional information, configurations, or important notes..." 
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-6 border-t">
          <Button type="button" variant="ghost" onClick={() => form.reset()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Asset...' : 'Create Asset'}
          </Button>
        </div>
      </form>
    </Form>
  );
}