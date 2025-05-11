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
import { MoreHorizontal, Loader2, ShieldAlert, ShieldCheck, User, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import {
  /*
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
    */
} from '@/components/ui/tooltip'
//import { useRouter } from 'next/navigation'

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
  //const router = useRouter()
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserData | null>(null)
  const [targetRole, setTargetRole] = useState<'admin' | 'user' | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)
  const [shouldRefresh, setShouldRefresh] = useState(false)

  // Function to fetch users
  const fetchUsers = async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }

      setIsLoading(true);
      try {
      const response = await fetch('/api/users', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
        if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please log in to view users.");
          return;
        }
        if (response.status === 403) {
          toast.error("You don't have permission to view users. Please log in as an admin.");
          return;
        }
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

  // Effect to handle initial load and refresh
  useEffect(() => {
    if (session?.user?.role === 'admin') {
    fetchUsers();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  // Effect to handle refresh after actions
  useEffect(() => {
    if (shouldRefresh) {
      fetchUsers();
      setShouldRefresh(false);
    }
  }, [shouldRefresh]);

  // Effect to handle dialog closing
  useEffect(() => {
    if (!isSubmitting && !isDeleting) {
      if (showConfirmDialog) {
      setShowConfirmDialog(false);
      setSelectedUserForRoleChange(null);
      setTargetRole(null);
  }
      if (userToDelete) {
        setUserToDelete(null);
      }
    }
  }, [isSubmitting, isDeleting]);

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
      toast.success(`User ${updatedUser.name || ''} role updated to ${updatedUser.role}`);
      
      // Reload the page after successful update
      window.location.reload();

    } catch (error: unknown) {
      console.error('Error updating user role:', error);
      const message = error instanceof Error ? error.message : 'Failed to update user role';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMsg = 'Failed to delete user';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || `API Error (${response.status})`;
        } catch (parseError) {
          console.error("API response parsing error:", parseError);
          errorMsg = `API Error (${response.status}) - Response not valid JSON`;
        }
        throw new Error(errorMsg);
      }

      toast.success(`User ${userToDelete.name || userToDelete.email} has been deleted`);
      
      // Reload the page after successful deletion
      window.location.reload();

    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const openConfirmationDialog = (user: UserData, role: 'admin' | 'user') => {
    if (user.id === session?.user?.id) {
      toast.error("You cannot change your own role.");
      return;
    }
    if (isSubmitting || isDeleting) return; // Prevent opening dialog while any operation is in progress
    setSelectedUserForRoleChange(user);
    setTargetRole(role);
    setShowConfirmDialog(true);
  }

  const closeConfirmDialog = () => {
    if (isSubmitting || isDeleting) return; // Prevent closing dialog while any operation is in progress
    setShowConfirmDialog(false);
    setSelectedUserForRoleChange(null);
    setTargetRole(null);
  }

  const openDeleteDialog = (user: UserData) => {
    if (user.id === session?.user?.id) {
      toast.error("You cannot delete your own account.");
      return;
    }
    if (isDeleting) return;
    setUserToDelete(user);
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

  //use it
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
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-lg text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-white text-xl animate-pulse flex items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              Loading users...
            </div>
            <div className="text-gray-400 text-sm">Fetching user data</div>
          </div>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-lg text-center">
          <div className="flex flex-col items-center gap-4">
            <ShieldAlert className="h-12 w-12 text-red-400" />
            <h2 className="text-xl font-semibold text-white">Access Denied</h2>
            <p className="text-gray-300">You do not have permission to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Manage Users</h1>
        <div className="text-sm text-gray-300">
          Total Users: {users.length}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-gray-800">
              <TableHead className="w-[100px] text-gray-300">Role</TableHead>
              <TableHead className="w-[80px] text-gray-300">Avatar</TableHead>
              <TableHead className="text-gray-300">Name</TableHead>
              <TableHead className="text-gray-300">Email</TableHead>
              <TableHead className="w-[150px] text-gray-300">Email Verified</TableHead>
              <TableHead className="text-gray-300">Created At</TableHead>
              <TableHead className="text-gray-300">Updated At</TableHead>
              <TableHead className="text-right w-[100px] text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-gray-300">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="border-gray-800 hover:bg-gray-800">
                  <TableCell className="font-medium">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {user.role === 'admin' ? (
                        <ShieldAlert className="w-3 h-3 mr-1"/>
                      ) : (
                        <User className="w-3 h-3 mr-1"/>
                      )}
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? 'User'} />
                      <AvatarFallback className="bg-gray-700 text-gray-300">
                        {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium text-white">{user.name || '-'}</TableCell>
                  <TableCell className="text-gray-300">{user.email || '-'}</TableCell>
                  <TableCell className="text-gray-300">{formatDate(user.emailVerified)}</TableCell>
                  <TableCell className="text-gray-300">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-gray-300">{formatDate(user.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    {user.id !== session?.user?.id ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={isSubmitting || isDeleting}
                            className="hover:bg-gray-800 text-gray-300"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-800">
                          <DropdownMenuLabel className="text-gray-300">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-800" />
                          {user.role !== 'admin' && (
                            <DropdownMenuItem 
                              onClick={() => openConfirmationDialog(user, 'admin')} 
                              disabled={isSubmitting || isDeleting}
                              className="text-red-400 focus:text-red-400 hover:bg-gray-800"
                            >
                              <ShieldCheck className="mr-2 h-4 w-4"/> Make Admin
                            </DropdownMenuItem>
                          )}
                          {user.role !== 'user' && (
                            <DropdownMenuItem 
                              onClick={() => openConfirmationDialog(user, 'user')} 
                              disabled={isSubmitting || isDeleting}
                              className="text-gray-300 focus:text-gray-300 hover:bg-gray-800"
                            >
                              <User className="mr-2 h-4 w-4"/> Make User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-gray-800" />
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(user)} 
                            disabled={isSubmitting || isDeleting}
                            className="text-red-400 focus:text-red-400 hover:bg-gray-800"
                          >
                            <Trash2 className="mr-2 h-4 w-4"/> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Role Change</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to change the role of{' '}
              <strong className="mx-1 text-white">{selectedUserForRoleChange?.name || selectedUserForRoleChange?.email}</strong>{' '}
              to{' '}
              <strong className={`capitalize ${
                targetRole === 'admin' ? 'text-red-400' : 'text-gray-300'
              }`}>
                {targetRole}
              </strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeConfirmDialog} 
              disabled={isSubmitting}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              variant={targetRole === 'admin' ? "destructive" : "default"} 
              onClick={handleRoleChange} 
              disabled={isSubmitting}
              className={`min-w-[100px] ${
                targetRole === 'admin' 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-white' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Updating...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm User Deletion</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to delete the user{' '}
              <strong className="text-white">{userToDelete?.name || userToDelete?.email}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setUserToDelete(null)} 
              disabled={isDeleting}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser} 
              disabled={isDeleting}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main page component that renders the form
export default function ManageUsersPage() {
    return (
        <div className="min-h-screen bg-gray-950 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg">
                    <h1 className="text-2xl font-bold mb-6 text-white tracking-wide flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Manage Users
                    </h1>
                    <ManageUsersForm />
                </div>
            </div>
        </div>
    );
} 