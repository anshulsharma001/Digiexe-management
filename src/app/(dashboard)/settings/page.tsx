"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, User as UserIcon, Shield, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
  });

  const userId = session?.user?.id;
  const { isSupported, isSubscribed, subscribe, unsubscribe } =
    usePushNotifications(userId);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;

      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const data = userDoc.data() as User;
          setUserData(data);
          setProfileData({
            name: data.name,
            email: data.email,
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleProfileUpdate = async () => {
    if (!userId || !profileData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);

    try {
      await updateDoc(doc(db, "users", userId), {
        name: profileData.name.trim(),
      });

      // Update session
      await update({ name: profileData.name.trim() });

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationPreferenceChange = async (
    key: "email" | "push",
    value: boolean
  ) => {
    if (!userId || !userData) return;

    try {
      const newPreferences = {
        ...userData.notificationPreferences,
        [key]: value,
      };

      await updateDoc(doc(db, "users", userId), {
        notificationPreferences: newPreferences,
      });

      setUserData({
        ...userData,
        notificationPreferences: newPreferences,
      });

      toast.success("Notification preferences updated");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update preferences");
    }
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success("Push notifications disabled");
        handleNotificationPreferenceChange("push", false);
      } else {
        toast.error("Failed to disable push notifications");
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success("Push notifications enabled");
        handleNotificationPreferenceChange("push", true);
      } else {
        toast.error("Failed to enable push notifications");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <UserIcon className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profileData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={userData?.role.replace("_", " ") || ""}
                  disabled
                  className="bg-muted capitalize"
                />
              </div>
              <Button onClick={handleProfileUpdate} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={userData?.notificationPreferences?.email ?? true}
                  onCheckedChange={(checked) =>
                    handleNotificationPreferenceChange("email", checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    {isSupported
                      ? "Receive browser push notifications"
                      : "Push notifications are not supported in this browser"}
                  </p>
                </div>
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handlePushToggle}
                  disabled={!isSupported}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Deadline Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified before task deadlines
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[48, 24, 12, 6, 1].map((hours) => {
                    const isEnabled =
                      userData?.notificationPreferences?.deadlineReminders?.includes(
                        hours
                      ) ?? true;
                    return (
                      <Button
                        key={hours}
                        variant={isEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={async () => {
                          if (!userId || !userData) return;

                          const currentReminders =
                            userData.notificationPreferences?.deadlineReminders || [
                              48, 24, 12, 6, 1,
                            ];
                          const newReminders = isEnabled
                            ? currentReminders.filter((h) => h !== hours)
                            : [...currentReminders, hours].sort((a, b) => b - a);

                          try {
                            await updateDoc(doc(db, "users", userId), {
                              "notificationPreferences.deadlineReminders":
                                newReminders,
                            });

                            setUserData({
                              ...userData,
                              notificationPreferences: {
                                ...userData.notificationPreferences,
                                deadlineReminders: newReminders,
                              },
                            });
                          } catch (error) {
                            console.error("Error updating reminders:", error);
                            toast.error("Failed to update reminder settings");
                          }
                        }}
                      >
                        {hours}h before
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground">
                  To change your password, use the &quot;Forgot Password&quot; option on the
                  login page.
                </p>
                <Button variant="outline" asChild>
                  <a href="/forgot-password">Reset Password</a>
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Account Status</Label>
                <p className="text-sm text-muted-foreground">
                  Your account is{" "}
                  <span className="text-green-500 font-medium">active</span>
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Member Since</Label>
                <p className="text-sm text-muted-foreground">
                  {userData?.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
