'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MoreHorizontal, CheckCircle, Loader2, ShieldAlert, ShieldCheck, User } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from '@/components/ui/tooltip'

// Define the User type based on API response (excluding password)
type UserData = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | string | null;
  image: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

function ManageUsersForm() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserData | null>(null)
  const [targetRole, setTargetRole] = useState<'admin' | 'user' | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error(`Failed to fetch users (${response.status})`);
        }
        const data: UserData[] = await response.json();
        setUsers(data);
      } catch (error: unknown) {
        console.error("Error fetching users:", error);
        const message = error instanceof Error ? error.message : "Failed to load users.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const openConfirmationDialog = (user: UserData, role: 'admin' | 'user') => {
      if (user.id === session?.user?.id) {
          toast.error("You cannot change your own role.");
          return;
      }
      setSelectedUserForRoleChange(user);
      setTargetRole(role);
      setShowConfirmDialog(true);
  }

  const closeConfirmDialog = () => {
      setShowConfirmDialog(false);
      setSelectedUserForRoleChange(null);
      setTargetRole(null);
  }

  const handleRoleChange = async () => {
    if (!selectedUserForRoleChange || !targetRole) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${selectedUserForRoleChange.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: targetRole }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to update user role';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || `API Error (${response.status})`;
        } catch (parseError) {
          console.error("API response parsing error:", parseError);
          errorMsg = `API Error (${response.status}) - Response not valid JSON`;
        }
        throw new Error(errorMsg);
      }

      const updatedUser: UserData = await response.json();

      // Update the user list in the state
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));

      toast.success(`User ${updatedUser.name || ''} role updated to ${updatedUser.role}`);
      closeConfirmDialog();

    } catch (error: unknown) {
      console.error('Error updating user role:', error);
      const message = error instanceof Error ? error.message : 'Failed to update user role';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Helper to format date or return placeholder
  const formatDate = (dateString: string | null | Date): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      // Use format from date-fns
      return format(date, 'PPpp'); // e.g., Aug 17, 2024, 5:30:00 PM
    } catch {
      return 'Invalid Date';
    }
  }

  const formatShortDate = (dateString: string | null | Date): string => {
      if (!dateString) return '-';
      try {
          const date = new Date(dateString);
          // Use format from date-fns for short date
          return format(date, 'yyyy-MM-dd');
      } catch {
          return 'Invalid Date';
      }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Role</TableHead>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[150px]">Email Verified</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && !isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role === 'admin' ? <ShieldAlert className="w-3 h-3 mr-1"/> : <User className="w-3 h-3 mr-1"/>} 
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </TableCell>
                   <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? 'User'} />
                      <AvatarFallback className="bg-gray-300">
                        {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell className="text-center">
                    {user.emailVerified ? (
                      <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                             <span className="inline-block">
                               <CheckCircle className="w-5 h-5 text-green-500" /> 
                             </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Verified: {formatDate(user.emailVerified)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                     ) : (
                      '-'
                     )}
                  </TableCell>
                  <TableCell title={formatDate(user.createdAt)}>{formatShortDate(user.createdAt)}</TableCell>
                  <TableCell title={formatDate(user.updatedAt)}>{formatShortDate(user.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    {user.id !== session?.user?.id ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isSubmitting}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {user.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => openConfirmationDialog(user, 'admin')} disabled={isSubmitting}>
                              <ShieldCheck className="mr-2 h-4 w-4 text-green-600"/> Make Admin
                            </DropdownMenuItem>
                          )}
                          {user.role !== 'user' && (
                            <DropdownMenuItem onClick={() => openConfirmationDialog(user, 'user')} disabled={isSubmitting}>
                              <User className="mr-2 h-4 w-4 text-blue-600"/> Make User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : ( 
                      <span className="text-xs text-gray-400 italic">Current User</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={(open) => !open && closeConfirmDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the role of 
              <strong className="mx-1">{selectedUserForRoleChange?.name || selectedUserForRoleChange?.email}</strong> 
              to <strong className={`capitalize ${targetRole === 'admin' ? 'text-red-600' : 'text-blue-600'}`}>{targetRole}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirmDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              variant={targetRole === 'admin' ? "destructive" : "default"} 
              onClick={handleRoleChange} 
              disabled={isSubmitting}
            >
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Main page component that renders the form
export default function ManageUsersPage() {
    // You might want to add page titles or other layout elements here
    return (
        <div className="p-4 md:p-6">
            <h1 className="text-2xl font-semibold mb-4">Manage Users</h1>
            <ManageUsersForm />
        </div>
    );
} 