'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  Archive, 
  ArchiveRestore, 
  UserX,
  MoreHorizontal,
  AlertTriangle
} from 'lucide-react';
import { InviteMemberDialog } from '@/components/modals/invite-member-dialog';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define the type for the combined list from our API
type MemberListItem = {
    type: 'member' | 'invitation';
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    role: string;
    status: 'Active' | 'Pending' | 'Archived'; // Added 'Archived' status
    joined: string;
    department: string | null;
};

export default function MembersPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    
    const [members, setMembers] = useState<MemberListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [memberToAction, setMemberToAction] = useState<MemberListItem | null>(null);
    const [actionType, setActionType] = useState<'archive' | 'unarchive' | 'remove' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchMembers = async () => {
        if (!workspaceId) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}/members`);
            if (!response.ok) throw new Error("Failed to fetch members");
            const data = await response.json();
            console.log(data , "data")
            setMembers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [workspaceId]);

    const handleArchiveMember = async (memberId: string) => {
        setIsProcessing(true);
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Archived' }),
            });
            
            if (!response.ok) throw new Error("Failed to archive member");
            
            setMembers(prev => prev.map(m => 
                m.id === memberId ? { ...m, status: 'Archived' } : m
            ));
        } catch (error) {
            console.error(error);
            alert('Failed to archive member');
        } finally {
            setIsProcessing(false);
            setMemberToAction(null);
            setActionType(null);
        }
    };

    const handleUnarchiveMember = async (memberId: string) => {
        setIsProcessing(true);
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Active' }),
            });
            
            if (!response.ok) throw new Error("Failed to activate member");
            
            setMembers(prev => prev.map(m => 
                m.id === memberId ? { ...m, status: 'Active' } : m
            ));
        } catch (error) {
            console.error(error);
            alert('Failed to activate member');
        } finally {
            setIsProcessing(false);
            setMemberToAction(null);
            setActionType(null);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        setIsProcessing(true);
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) throw new Error("Failed to remove member");
            
            setMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (error) {
            console.error(error);
            alert('Failed to remove member');
        } finally {
            setIsProcessing(false);
            setMemberToAction(null);
            setActionType(null);
        }
    };

    const openActionDialog = (member: MemberListItem, action: 'archive' | 'unarchive' | 'remove') => {
        setMemberToAction(member);
        setActionType(action);
    };

    const getActionTitle = () => {
        if (!actionType || !memberToAction) return '';
        
        switch (actionType) {
            case 'archive':
                return `Archive ${memberToAction.name || memberToAction.email}?`;
            case 'unarchive':
                return `Activate ${memberToAction.name || memberToAction.email}?`;
            case 'remove':
                return `Remove ${memberToAction.name || memberToAction.email}?`;
            default:
                return '';
        }
    };

    const getActionDescription = () => {
        if (!actionType || !memberToAction) return '';
        
        switch (actionType) {
            case 'archive':
                return 'This member will lose access to the workspace but can be restored later.';
            case 'unarchive':
                return 'This member will regain full access to the workspace.';
            case 'remove':
                return 'This member will be permanently removed from the workspace. This action cannot be undone.';
            default:
                return '';
        }
    };

    const getActionConfirmText = () => {
        switch (actionType) {
            case 'archive':
                return 'Archive';
            case 'unarchive':
                return 'Activate';
            case 'remove':
                return 'Remove';
            default:
                return 'Confirm';
        }
    };

    const confirmAction = () => {
        if (!memberToAction || !actionType) return;
        
        switch (actionType) {
            case 'archive':
                handleArchiveMember(memberToAction.id);
                break;
            case 'unarchive':
                handleUnarchiveMember(memberToAction.id);
                break;
            case 'remove':
                handleRemoveMember(memberToAction.id);
                break;
        }
    };

    return (
        <div className="p-4 md:p-8">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Members</h1>
                    <p className="text-muted-foreground">Manage who has access to this workspace.</p>
                </div>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite member
                </Button>
            </header>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Member</TableHead>
                            <TableHead className="w-[20%]">Department</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined / Invited</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    Loading members...
                                </TableCell>
                            </TableRow>
                        ) : (
                            members.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage className='object-cover' src={item.avatar || ""} />
                                                <AvatarFallback>
                                                    {item.email.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{item.name ?? item.email}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {item.department ? (
                                            item.department
                                        ) : (
                                            <span className="text-muted-foreground">Not set</span>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <Badge variant="outline">{item.role}</Badge>
                                    </TableCell>

                                    <TableCell>
                                        {item.status === "Active" ? (
                                            <Badge variant="outline" className="text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20">
                                                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                                Active
                                            </Badge>
                                        ) : item.status === "Archived" ? (
                                            <Badge variant="outline" className="text-gray-600 dark:text-gray-400 bg-gray-500/10 border-gray-500/20">
                                                <Archive className="mr-2 h-3.5 w-3.5" />
                                                Archived
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                                                <Clock className="mr-2 h-3.5 w-3.5" />
                                                Pending
                                            </Badge>
                                        )}
                                    </TableCell>

                                    <TableCell>{format(new Date(item.joined), "PP")}</TableCell>

                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {item.type === 'member' && item.status === 'Active' && (
                                                    <DropdownMenuItem onClick={() => openActionDialog(item, 'archive')}>
                                                        <Archive className="mr-2 h-4 w-4" />
                                                        Archive
                                                    </DropdownMenuItem>
                                                )}
                                                {item.type === 'member' && item.status === 'Archived' && (
                                                    <DropdownMenuItem onClick={() => openActionDialog(item, 'unarchive')}>
                                                        <ArchiveRestore className="mr-2 h-4 w-4" />
                                                        Activate
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem 
                                                    onClick={() => openActionDialog(item, 'remove')}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <UserX className="mr-2 h-4 w-4" />
                                                    Remove
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <InviteMemberDialog
                workspaceId={workspaceId}
                open={isInviteDialogOpen}
                onOpenChange={setIsInviteDialogOpen}
                onInviteSent={fetchMembers}
            />

            {/* Action Confirmation Dialog */}
            <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {actionType === 'remove' && (
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                            )}
                            {getActionTitle()}
                        </DialogTitle>
                        <DialogDescription>
                            {getActionDescription()}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionType(null)}>
                            Cancel
                        </Button>
                        <Button 
                            variant={actionType === 'remove' ? 'destructive' : 'default'}
                            onClick={confirmAction}
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Processing...' : getActionConfirmText()}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}