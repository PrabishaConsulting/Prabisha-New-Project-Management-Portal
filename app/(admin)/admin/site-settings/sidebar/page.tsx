"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { arrayMove } from "@dnd-kit/sortable";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import dynamic from "next/dynamic";
const SidebarSettingsSection = dynamic(() => import("./SidebarSettingsCard"), { ssr: false });
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sidebar,
  Plus,
  Trash,
  Edit,
  ChevronDown,
  Loader2,
  Save,
  X,
  Copy,
  GripVertical,
} from "lucide-react";

const iconMap = {
  Home: "Home", Settings: "Settings", User: "User", Mail: "Mail", Calendar: "Calendar", FileText: "FileText", BarChart3: "BarChart3", Shield: "Shield", Database: "Database", Bell: "Bell", Search: "Search", Plus: "Plus", Edit: "Edit", Trash: "Trash", Eye: "Eye", Download: "Download", Upload: "Upload", Share: "Share", Copy: "Copy", Save: "Save", Menu: "Menu", X: "X", ChevronLeft: "ChevronLeft", ChevronRight: "ChevronRight", ChevronUp: "ChevronUp", ChevronDown: "ChevronDown", Star: "Star", Heart: "Heart", Bookmark: "Bookmark", Tag: "Tag", Folder: "Folder", Image: "Image", Video: "Video", Music: "Music", Phone: "Phone", MessageCircle: "MessageCircle", Clock: "Clock", MapPin: "MapPin", Globe: "Globe", Wifi: "Wifi", Battery: "Battery", Volume2: "Volume2", Camera: "Camera", Mic: "Mic", Lock: "Lock", Unlock: "Unlock", Key: "Key", CreditCard: "CreditCard", ShoppingCart: "ShoppingCart", Package: "Package", Truck: "Truck", Users: "Users", UserPlus: "UserPlus", Award: "Award", Trophy: "Trophy", Target: "Target", Zap: "Zap", Sun: "Sun", Moon: "Moon", Cloud: "Cloud", Umbrella: "Umbrella", Thermometer: "Thermometer", Activity: "Activity", TrendingUp: "TrendingUp", TrendingDown: "TrendingDown", PieChart: "PieChart", LineChart: "LineChart", BarChart: "BarChart", Navigation: "Navigation", Compass: "Compass", Map: "Map", Layers: "Layers", Filter: "Filter", Sliders: "Sliders", Wrench: "Wrench", Hammer: "Hammer", Paintbrush: "Paintbrush", Palette: "Palette", Code: "Code", Terminal: "Terminal", Server: "Server", HardDrive: "HardDrive", Cpu: "Cpu", Monitor: "Monitor", Smartphone: "Smartphone", Tablet: "Tablet", Laptop: "Laptop", Headphones: "Headphones", Speaker: "Speaker", Gamepad2: "Gamepad2", Joystick: "Joystick", Dice1: "Dice1", Dice2: "Dice2", Dice3: "Dice3", Dice4: "Dice4", Dice5: "Dice5", Dice6: "Dice6", PlayCircle: "PlayCircle", PauseCircle: "PauseCircle", StopCircle: "StopCircle", SkipBack: "SkipBack", SkipForward: "SkipForward", Rewind: "Rewind", FastForward: "FastForward", Volume: "Volume", VolumeX: "VolumeX", Repeat: "Repeat", Shuffle: "Shuffle", Radio: "Radio", Tv: "Tv", Film: "Film", Coffee: "Coffee", Pizza: "Pizza", Apple: "Apple", Car: "Car", Bike: "Bike", Plane: "Plane", Train: "Train", Ship: "Ship", Bus: "Bus", Fuel: "Fuel", LocationPin: "LocationPin", Route: "Route", Flag: "Flag", Anchor: "Anchor", Mountain: "Mountain", TreePine: "TreePine", Flower: "Flower", Leaf: "Leaf", Snowflake: "Snowflake", Rainbow: "Rainbow", Sunset: "Sunset", Sunrise: "Sunrise"
};

const sidebarItemSchema = z.object({
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Href is required"),
  icon: z.string().optional(),
  position: z.number().min(0).optional(),
  roleIds: z.array(z.string()).optional(),
});

const groupSchema = z.object({
  title: z.string().min(1, "Title is required"),
  position: z.number().min(0),
  roleIds: z.array(z.string()).optional(), // Added roleIds to schema
});

interface SidebarGroup {
  id: string;
  title: string;
  position: number;
  items: SidebarItem[];
  roleAccess?: { roleId: string; hasAccess: boolean; role: string }[]; // Added roleAccess
}

interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  position: number;
  roleAccess?: { roleId: string; hasAccess: boolean; role: string }[];
}

interface Role {
  id: string;
  name: string;
}

interface SortableGroupProps {
  group: SidebarGroup;
  isSelected: boolean;
  onSelect: (group: SidebarGroup) => void;
  onEdit: (group: SidebarGroup) => void;
  onDelete: (id: string) => void;
}

function SortableGroup({ group, isSelected, onSelect, onEdit, onDelete }: SortableGroupProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: group.id,
    data: {
      type: 'group',
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-md cursor-pointer flex justify-between items-center hover:bg-muted border ${
        isSelected ? 'border-primary bg-primary/10' : 'border-transparent'
      }`}
      onClick={() => onSelect(group)}
    >
      <div className="flex items-center gap-2" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <span>{group.title}</span>
      </div>
      <div className="flex items-center">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(group);
          }}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(group.id);
          }}
        >
          <Trash className="w-4 h-4" />
        </Button>
      </div>
    </li>
  );
}

interface SortableItemProps {
  item: SidebarItem;
  onEdit: (item: SidebarItem) => void;
  onDelete: (id: string) => void;
}

function SortableItem({ item, onEdit, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: item.id,
    data: {
      type: 'item',
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="p-3 rounded-md border flex items-center justify-between hover:bg-muted"
    >
      <div className="flex items-center gap-3" {...attributes} {...listeners}>
        <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
        <div>
          <p className="font-semibold">{item.label}</p>
          <p className="text-sm text-muted-foreground">{item.href} • pos {item.position ?? 0}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(item)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(item.id)}
        >
          <Trash className="w-4 h-4" />
        </Button>
      </div>
    </li>
  );
}

export default function SidebarAdminPage() {
  const [groups, setGroups] = useState<SidebarGroup[]>([]);
  const [roles, setRoles] = useState<Role[]>([]); // New state for roles
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isGroupModalOpen, setGroupModalOpen] = useState(false);
  const [isItemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SidebarItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<SidebarGroup | null>(null);

  const selectedGroup = selectedGroupId ? groups.find(g => g.id === selectedGroupId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<z.infer<typeof sidebarItemSchema>>({
    resolver: zodResolver(sidebarItemSchema),
    defaultValues: { roleIds: [] },
  });
  
  const { register: registerGroup, handleSubmit: handleSubmitGroup, reset: resetGroup, setValue: setGroupValue, control: groupControl, formState: { errors: groupErrors } } = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { roleIds: [] }, // Set default for roleIds
  });

  // Fixed fetchGroups without dependencies that could cause infinite loops
  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/site-settings/sidebar");
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      const sortedGroups = data.data
        .sort((a: any, b: any) => a.position - b.position)
        .map((group: SidebarGroup) => ({
          ...group,
          items: group.items.sort((a: any, b: any) => a.position - b.position),
        }));
      setGroups(sortedGroups);
      
      // Only set selected group if none is selected and groups exist
      if (!selectedGroupId && sortedGroups.length > 0) {
        setSelectedGroupId(sortedGroups[0].id);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error("Failed to fetch sidebar groups");
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroupId]); // Empty dependency array to prevent infinite loops

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setRoles(data.roles);
    } catch (error) {
      console.error('Fetch roles error:', error);
      toast.error("Failed to fetch roles");
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchGroups();
    fetchRoles(); // Fetch roles on initial load
  }, [fetchGroups, fetchRoles]);

  // Reset form when editing item changes
  useEffect(() => {
    if (editingItem) {
      reset({
        label: editingItem.label,
        href: editingItem.href,
        icon: editingItem.icon || "",
        position: editingItem.position,
        roleIds: editingItem.roleAccess?.map(ra => ra.roleId) || [],
      });
    } else {
      reset({
        label: "",
        href: "",
        icon: "",
        position: 0,
        roleIds: [],
      });
    }
  }, [editingItem, reset]);

  // Reset group form when modal opens/closes or selected group changes
  useEffect(() => {
    if (isGroupModalOpen) {
      if (editingGroup) {
        resetGroup({
          title: editingGroup.title,
          position: editingGroup.position,
          roleIds: editingGroup.roleAccess?.map(ra => ra.roleId) || [],
        });
      } else {
        resetGroup({ title: "", position: groups.length, roleIds: [] });
      }
    } 
  }, [isGroupModalOpen, editingGroup, resetGroup, groups.length]);

  const handleGroupSelect = useCallback((group: SidebarGroup) => {
    setSelectedGroupId(group.id);
  }, []);

  const handleEditGroup = (group: SidebarGroup) => {
    setEditingGroup(group);
    setGroupModalOpen(true);
  };

  const handleEditItem = useCallback((item: SidebarItem) => {
    setEditingItem(item);
    setItemModalOpen(true);
  }, []);

  const onGroupSubmit = async (values: z.infer<typeof groupSchema>) => {
    setIsSubmitting(true);
    try {
      const method = editingGroup ? "PUT" : "POST";
      const url = "/api/site-settings/sidebar/groups";
      const body = editingGroup 
        ? { ...values, id: editingGroup.id } 
        : { ...values, position: values.position ?? groups.length };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      toast.success(`Group ${editingGroup ? 'updated' : 'created'} successfully`);
      setGroupModalOpen(false);
      setEditingGroup(null);
      resetGroup();
      
      await fetchGroups();

    } catch (error) {
      console.error('Group submit error:', error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onItemSubmit = async (values: z.infer<typeof sidebarItemSchema>) => {
    if (!selectedGroup) return;
    setIsSubmitting(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const url = "/api/site-settings/sidebar/items";
      const body = editingItem 
        ? { ...values, id: editingItem.id } 
        : { ...values, sidebarGroupId: selectedGroup.id };
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      toast.success(`Item ${editingItem ? 'updated' : 'added'} successfully`);
      setItemModalOpen(false);
      setEditingItem(null);
      await fetchGroups();

    } catch (error) {
      console.error('Item submit error:', error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      const res = await fetch("/api/site-settings/sidebar/groups", { 
        method: "DELETE", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }) 
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Group deleted");
      if (selectedGroupId === id) {
        setSelectedGroupId(null);
      }
      await fetchGroups();
    } catch (error) {
      console.error('Delete group error:', error);
      toast.error("Failed to delete group");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch("/api/site-settings/sidebar/items", { 
        method: "DELETE", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }) 
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Item deleted");
      await fetchGroups();
    } catch (error) {
      console.error('Delete item error:', error);
      toast.error("Failed to delete item");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      if (active.data.current?.type === 'group') {
        const oldIndex = groups.findIndex(group => group.id === active.id);
        const newIndex = groups.findIndex(group => group.id === over.id);
        const newGroups = arrayMove(groups, oldIndex, newIndex);
        setGroups(newGroups);

        try {
          const res = await fetch("/api/site-settings/sidebar/groups/reorder", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupIds: newGroups.map(g => g.id) }),
          });
          if (!res.ok) throw new Error("Request failed");
          toast.success("Groups reordered successfully");
        } catch (error) {
          console.error('Reorder groups error:', error);
          toast.error("Failed to reorder groups");
          // Revert optimistic update
          await fetchGroups();
        }
      } else if (active.data.current?.type === 'item' && selectedGroup) {
        const oldIndex = selectedGroup.items.findIndex(item => item.id === active.id);
        const newIndex = selectedGroup.items.findIndex(item => item.id === over.id);
        const newItems = arrayMove(selectedGroup.items, oldIndex, newIndex);

        // Optimistic update
        const updatedGroups = groups.map(g => 
          g.id === selectedGroup.id ? { ...g, items: newItems } : g
        );
        setGroups(updatedGroups);

        try {
          const res = await fetch("/api/site-settings/sidebar/items/reorder", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemIds: newItems.map(i => i.id), groupId: selectedGroup.id }),
          });
          if (!res.ok) throw new Error("Request failed");
          toast.success("Items reordered successfully");
        } catch (error) {
          console.error('Reorder items error:', error);
          toast.error("Failed to reorder items");
          // Revert optimistic update
          await fetchGroups();
        }
      }
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemModalOpen(true);
  };
  
  const handleNewGroup = () => {
    setEditingGroup(null);
    setGroupModalOpen(true);
  }

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 dark:text-white">
            <Sidebar className="w-8 h-8" /> Manage Sidebar
          </h1>
          <Button onClick={handleNewGroup} className="dark:bg-white">
            <Plus className="w-4 h-4 mr-2" /> New Group
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Sidebar Groups</CardTitle>
              <CardDescription>Drag and drop to reorder. Click to select.</CardDescription>
            </CardHeader>
            <CardContent>
              {groups.length > 0 ? (
                <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {groups.map(group => (
                      <SortableGroup 
                        key={group.id} 
                        group={group} 
                        isSelected={selectedGroupId === group.id}
                        onSelect={handleGroupSelect}
                        onEdit={handleEditGroup}
                        onDelete={deleteGroup}
                      />
                    ))}
                  </ul>
                </SortableContext>
              ) : (
                <p className="text-muted-foreground">No groups found. Create your first group to get started.</p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  {selectedGroup ? `Items in "${selectedGroup.title}"` : "Select a Group"}
                </CardTitle>
              </div>
              {selectedGroup && (
                <Button size="sm" onClick={handleAddItem} className="dark:bg-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {selectedGroup ? (
                selectedGroup.items.length > 0 ? (
                  <SortableContext items={selectedGroup.items.map(item => item.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {selectedGroup.items.map(item => (
                        <SortableItem 
                          key={item.id} 
                          item={item} 
                          onEdit={handleEditItem}
                          onDelete={deleteItem}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                ) : (
                  <p className="text-muted-foreground">No items in this group. Add your first item to get started.</p>
                )
              ) : (
                <p className="text-muted-foreground">Select a group to see its items.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="mt-6">
          {/** Lazy import keeps page snappy even if settings load slowly */}
          <SidebarSettingsSection />
        </div>

        {/* Group Modal */}
        <Dialog open={isGroupModalOpen} onOpenChange={setGroupModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? "Edit" : "Create New"} Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitGroup(onGroupSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  {...registerGroup("title")} 
                  placeholder="Enter group title"
                />
                {groupErrors.title && (
                  <p className="text-sm text-red-500">{groupErrors.title.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input 
                  id="position" 
                  type="number" 
                  defaultValue={groups.length}
                  {...registerGroup("position", { valueAsNumber: true })} 
                />
                {groupErrors.position && (
                  <p className="text-sm text-red-500">{groupErrors.position.message}</p>
                )}
              </div>
              <div>
                <Label>Role Access</Label>
                <div className="space-y-2">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Controller
                        name="roleIds"
                        control={groupControl}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value?.includes(role.id)}
                            onCheckedChange={(checked) => {
                              const newRoleIds = checked
                                ? [...(field.value || []), role.id]
                                : (field.value || []).filter(
                                    (id: string) => id !== role.id
                                  );
                              field.onChange(newRoleIds);
                            }}
                          />
                        )}
                      />
                      <Label htmlFor={`role-${role.id}`}>{role.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button" onClick={() => setEditingGroup(null)}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingGroup ? "Save Changes" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Item Modal */}
        <Dialog 
          open={isItemModalOpen} 
          onOpenChange={(open) => { 
            if (!open) setEditingItem(null); 
            setItemModalOpen(open); 
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit" : "Add"} Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onItemSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="label">Label</Label>
                <Input 
                  id="label" 
                  {...register("label")} 
                  placeholder="Enter item label"
                />
                {errors.label && (
                  <p className="text-sm text-red-500">{errors.label.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="href">Href</Label>
                <Input 
                  id="href" 
                  {...register("href")} 
                  placeholder="/example-path"
                />
                {errors.href && (
                  <p className="text-sm text-red-500">{errors.href.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Select onValueChange={(v) => setValue("icon", v)} value={editingItem?.icon || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an icon" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="none">No icon</SelectItem>
                    {Object.keys(iconMap).map(iconName => (
                      <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input 
                  id="position" 
                  type="number" 
                  defaultValue={selectedGroup?.items.length || 0}
                  {...register("position", { valueAsNumber: true })} 
                />
                {errors.position && (
                  <p className="text-sm text-red-500">{errors.position.message}</p>
                )}
              </div>
              <div>
                <Label>Role Access</Label>
                <div className="space-y-2">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Controller
                        name="roleIds"
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value?.includes(role.id)}
                            onCheckedChange={(checked) => {
                              const newRoleIds = checked
                                ? [...(field.value || []), role.id]
                                : (field.value || []).filter(
                                    (id: string) => id !== role.id
                                  );
                              field.onChange(newRoleIds);
                            }}
                          />
                        )}
                      />
                      <Label htmlFor={`item-role-${role.id}`}>{role.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingItem ? "Save Changes" : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}