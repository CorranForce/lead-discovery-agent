import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { useEffect, useState } from "react";

export default function AuthDebug() {
  const { user, isAuthenticated, loading, error } = useAuth();
  const [cookies, setCookies] = useState<string>("");
  const [localStorage, setLocalStorage] = useState<any>(null);

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie || "No cookies found");
    
    // Get localStorage user info
    const stored = window.localStorage.getItem("manus-runtime-user-info");
    setLocalStorage(stored ? JSON.parse(stored) : null);
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Authentication Debug Page</h1>
          <p className="text-muted-foreground">
            This page shows the current authentication status and session details.
          </p>
        </div>

        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Authenticated
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Not Authenticated
                </>
              )}
            </CardTitle>
            <CardDescription>
              Current authentication state from useAuth() hook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Loading</p>
                <Badge variant={loading ? "default" : "secondary"}>
                  {loading ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Is Authenticated</p>
                <Badge variant={isAuthenticated ? "default" : "secondary"}>
                  {isAuthenticated ? "Yes" : "No"}
                </Badge>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm font-medium text-destructive">Error:</p>
                <p className="text-sm text-destructive/80">{error.message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Object */}
        <Card>
          <CardHeader>
            <CardTitle>User Object</CardTitle>
            <CardDescription>
              Data returned from trpc.auth.me.useQuery()
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm">
                {JSON.stringify(user, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">No user data (null)</p>
            )}
          </CardContent>
        </Card>

        {/* Cookies */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Cookies</CardTitle>
            <CardDescription>
              All cookies currently set in the browser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm whitespace-pre-wrap break-all">
              {cookies}
            </pre>
          </CardContent>
        </Card>

        {/* LocalStorage */}
        <Card>
          <CardHeader>
            <CardTitle>LocalStorage User Info</CardTitle>
            <CardDescription>
              Cached user data in localStorage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {localStorage ? (
              <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm">
                {JSON.stringify(localStorage, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">No cached user data</p>
            )}
          </CardContent>
        </Card>

        {/* Expected Behavior */}
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Expected Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>For unauthenticated users:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Is Authenticated: <strong>No</strong></li>
              <li>User Object: <strong>null</strong></li>
              <li>Cookies: <strong>No session cookie</strong></li>
              <li>LocalStorage: <strong>No cached user data</strong></li>
            </ul>
            
            <p className="mt-4">
              <strong>For authenticated users:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Is Authenticated: <strong>Yes</strong></li>
              <li>User Object: <strong>Contains user data</strong></li>
              <li>Cookies: <strong>Session cookie present</strong></li>
              <li>LocalStorage: <strong>Cached user data present</strong></li>
            </ul>

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded">
              <p className="text-yellow-700 dark:text-yellow-300">
                <strong>Note:</strong> If you're the project owner accessing via the Manus domain,
                you may be automatically authenticated at the gateway level, even in incognito mode.
                To test true unauthenticated access, publish to a custom domain.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
