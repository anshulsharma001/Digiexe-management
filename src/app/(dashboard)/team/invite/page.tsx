"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invitation, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  ArrowLeft,
  Loader2,
  Mail,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  formatDate,
  formatRelativeTime,
  generateToken,
  isAdminOrHigher,
  isSuperAdmin,
  isValidEmail,
} from "@/lib/utils";
import { toast } from "sonner";

export default function InviteMembersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [deleteInvitationId, setDeleteInvitationId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    role: "MEMBER" as Exclude<Role, "SUPER_ADMIN">,
  });

  const userRole = session?.user?.role || "MEMBER";
  const isAdmin = isAdminOrHigher(userRole);
  const isSuperAdminUser = isSuperAdmin(userRole);

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/dashboard");
      toast.error("You don't have permission to invite members");
    }
  }, [session, isAdmin, router]);

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const snapshot = await getDocs(collection(db, "invitations"));
        const invitationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Invitation[];

        // Sort by date, newest first
        const sorted = invitationsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setInvitations(sorted);
      } catch (error) {
        console.error("Error fetching invitations:", error);
        toast.error("Failed to load invitations");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchInvitations();
    }
  }, [isAdmin]);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !isValidEmail(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check if invitation already exists
    const existingInvitation = invitations.find(
      (inv) =>
        inv.email.toLowerCase() === formData.email.toLowerCase() &&
        inv.status === "PENDING"
    );

    if (existingInvitation) {
      toast.error("An invitation has already been sent to this email");
      return;
    }

    setIsSending(true);

    try {
      const token = generateToken(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiration

      const invitationData: Omit<Invitation, "id"> = {
        email: formData.email.toLowerCase(),
        role: formData.role,
        token,
        expiresAt: Timestamp.fromDate(expiresAt),
        status: "PENDING",
        invitedById: session?.user?.id || "",
        invitedByName: session?.user?.name || "",
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "invitations"), invitationData);

      // Send invitation email via API
      const response = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          token,
          invitedByName: session?.user?.name,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        console.warn("Failed to send email, but invitation was created");
      }

      setInvitations((prev) => [
        { id: docRef.id, ...invitationData } as Invitation,
        ...prev,
      ]);

      setFormData({ email: "", role: "MEMBER" });
      toast.success("Invitation sent successfully");
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteInvitation = async () => {
    if (!deleteInvitationId) return;

    try {
      await deleteDoc(doc(db, "invitations", deleteInvitationId));
      setInvitations((prev) =>
        prev.filter((inv) => inv.id !== deleteInvitationId)
      );
      toast.success("Invitation revoked");
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast.error("Failed to revoke invitation");
    } finally {
      setDeleteInvitationId(null);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invitation link copied to clipboard");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "EXPIRED":
      case "REVOKED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "success";
      case "EXPIRED":
      case "REVOKED":
        return "destructive";
      default:
        return "warning";
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/team">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Invite Members</h1>
          <p className="text-muted-foreground">
            Send invitations to new team members
          </p>
        </div>
      </div>

      {/* Invitation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Invitation</CardTitle>
          <CardDescription>
            Enter an email address to invite a new team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={isSending}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: Exclude<Role, "SUPER_ADMIN">) =>
                    setFormData({ ...formData, role: value })
                  }
                  disabled={isSending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    {isSuperAdminUser && (
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Track and manage sent invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border rounded-lg animate-pulse"
                >
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-48" />
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                  <div className="h-8 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No invitations sent yet
            </p>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invitation.status)}
                      <span className="font-medium">{invitation.email}</span>
                      <Badge variant={getStatusBadgeVariant(invitation.status) as any}>
                        {invitation.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>Role: {invitation.role}</span>
                      <span className="mx-2">|</span>
                      <span>Invited by {invitation.invitedByName}</span>
                      <span className="mx-2">|</span>
                      <span>
                        {invitation.status === "PENDING"
                          ? `Expires ${formatRelativeTime(invitation.expiresAt)}`
                          : formatRelativeTime(invitation.createdAt)}
                      </span>
                    </div>
                  </div>
                  {invitation.status === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteLink(invitation.token)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-500"
                        onClick={() => setDeleteInvitationId(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteInvitationId}
        onOpenChange={() => setDeleteInvitationId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this invitation? The recipient
              will no longer be able to use the invitation link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteInvitationId(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteInvitation}>
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
