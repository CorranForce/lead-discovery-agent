import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Settings, BarChart3, Save } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function Account() {
  const { data: profile, isLoading: loadingProfile } = trpc.account.getProfile.useQuery();
  const { data: stats, isLoading: loadingStats } = trpc.account.getStats.useQuery();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [useRealData, setUseRealData] = useState(false);

  // Update form when profile loads
  useState(() => {
    if (profile) {
      setName(profile.name || "");
      setBio(profile.bio || "");
      setCompany(profile.company || "");
      setJobTitle(profile.jobTitle || "");
      setPhone(profile.phone || "");
      setWebsite(profile.website || "");
      setLocation(profile.location || "");
      setEmailNotifications(profile.emailNotifications === 1);
      setUseRealData(profile.useRealData === 1);
    }
  });

  const updateProfileMutation = trpc.account.updateProfile.useMutation({
    onSuccess: () => {
      utils.account.getProfile.invalidate();
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const updatePreferencesMutation = trpc.account.updatePreferences.useMutation({
    onSuccess: () => {
      utils.account.getProfile.invalidate();
      toast.success("Preferences updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update preferences: ${error.message}`);
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      name: name || undefined,
      bio: bio || undefined,
      company: company || undefined,
      jobTitle: jobTitle || undefined,
      phone: phone || undefined,
      website: website || undefined,
      location: location || undefined,
    });
  };

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate({
      emailNotifications: emailNotifications ? 1 : 0,
      useRealData: useRealData ? 1 : 0,
    });
  };

  if (loadingProfile) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Navigation />
    <div className="container py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground text-lg">
          Manage your profile, settings, and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and professional details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Acme Inc."
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="Sales Manager"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your experience and notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for important updates
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="use-real-data">Use Real Lead Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable Apollo.io integration for real company data (requires API key)
                  </p>
                </div>
                <Switch
                  id="use-real-data"
                  checked={useRealData}
                  onCheckedChange={setUseRealData}
                />
              </div>
              
              {useRealData && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    <strong>ℹ️ Real Data Mode:</strong> Lead discovery will use Apollo.io's database of 210M+ contacts. API calls consume credits from your Apollo plan.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSavePreferences}
                  disabled={updatePreferencesMutation.isPending}
                >
                  {updatePreferencesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loadingStats ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    stats?.totalLeads || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Leads discovered and saved
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Conversations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loadingStats ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    stats?.totalConversations || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Sales conversations tracked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Emails Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loadingStats ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    stats?.totalEmails || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Follow-up emails sent
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm font-medium">Account Created</span>
                <span className="text-sm text-muted-foreground">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm font-medium">Last Sign In</span>
                <span className="text-sm text-muted-foreground">
                  {profile?.lastSignedIn ? new Date(profile.lastSignedIn).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-medium">Account Type</span>
                <span className="text-sm text-muted-foreground capitalize">
                  {profile?.role || "User"}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
