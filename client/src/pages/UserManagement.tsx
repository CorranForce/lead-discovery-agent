import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Filter } from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "suspended" | "trial">("all");
  const [tierFilter, setTierFilter] = useState<"all" | "free" | "basic" | "pro" | "enterprise">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Form state for editing
  const [editStatus, setEditStatus] = useState<"active" | "inactive" | "suspended" | "trial">("active");
  const [editTier, setEditTier] = useState<"free" | "basic" | "pro" | "enterprise">("free");
  const [editBillingCycle, setEditBillingCycle] = useState<"monthly" | "yearly" | "none">("none");
  const [editNextBillingDate, setEditNextBillingDate] = useState("");

  const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery({
    status: statusFilter,
    tier: tierFilter,
  });

  const updateStatusMutation = trpc.admin.updateUserStatus.useMutation({
    onSuccess: () => {
      toast.success("User status updated successfully");
      refetch();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const updateBillingMutation = trpc.admin.updateUserBilling.useMutation({
    onSuccess: () => {
      toast.success("User billing updated successfully");
      refetch();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to update billing: ${error.message}`);
    },
  });

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditStatus(user.accountStatus);
    setEditTier(user.subscriptionTier);
    setEditBillingCycle(user.billingCycle);
    setEditNextBillingDate(user.nextBillingDate ? new Date(user.nextBillingDate).toISOString().split('T')[0] : "");
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedUser) return;

    // Update status if changed
    if (editStatus !== selectedUser.accountStatus) {
      await updateStatusMutation.mutateAsync({
        userId: selectedUser.id,
        status: editStatus,
      });
    }

    // Update billing if changed
    const billingChanged = 
      editTier !== selectedUser.subscriptionTier ||
      editBillingCycle !== selectedUser.billingCycle ||
      editNextBillingDate !== (selectedUser.nextBillingDate ? new Date(selectedUser.nextBillingDate).toISOString().split('T')[0] : "");

    if (billingChanged) {
      await updateBillingMutation.mutateAsync({
        userId: selectedUser.id,
        subscriptionTier: editTier,
        billingCycle: editBillingCycle,
        nextBillingDate: editNextBillingDate || undefined,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trial: "secondary",
      inactive: "outline",
      suspended: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      free: "bg-gray-500",
      basic: "bg-blue-500",
      pro: "bg-purple-500",
      enterprise: "bg-amber-500",
    };
    return <Badge className={colors[tier] || "bg-gray-500"}>{tier}</Badge>;
  };

  const filteredUsers = users?.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.company?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts, subscriptions, and billing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8 text-muted-foreground" />
          <span className="text-2xl font-bold">{filteredUsers?.length || 0}</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Account Status</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subscription Tier</Label>
              <Select value={tierFilter} onValueChange={(value: any) => setTierFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {filteredUsers?.length || 0} user{filteredUsers?.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Billing Cycle</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>{user.company || "—"}</TableCell>
                    <TableCell>{getStatusBadge(user.accountStatus)}</TableCell>
                    <TableCell>{getTierBadge(user.subscriptionTier)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.billingCycle}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.nextBillingDate
                        ? new Date(user.nextBillingDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User Account</DialogTitle>
            <DialogDescription>
              Manage account status, subscription tier, and billing for {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Status</Label>
                <Select value={editStatus} onValueChange={(value: any) => setEditStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Subscription Tier</Label>
                <Select value={editTier} onValueChange={(value: any) => setEditTier(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Billing Cycle</Label>
                <Select value={editBillingCycle} onValueChange={(value: any) => setEditBillingCycle(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Next Billing Date</Label>
                <Input
                  type="date"
                  value={editNextBillingDate}
                  onChange={(e) => setEditNextBillingDate(e.target.value)}
                />
              </div>
            </div>

            {/* User Info Display */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">User Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Email:</span> {selectedUser?.email || "—"}</div>
                <div><span className="text-muted-foreground">Company:</span> {selectedUser?.company || "—"}</div>
                <div><span className="text-muted-foreground">Role:</span> {selectedUser?.role || "—"}</div>
                <div><span className="text-muted-foreground">Created:</span> {selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "—"}</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveChanges}
              disabled={updateStatusMutation.isPending || updateBillingMutation.isPending}
            >
              {(updateStatusMutation.isPending || updateBillingMutation.isPending) ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
