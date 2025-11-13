import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MousePointerClick, Link as LinkIcon, Mail } from "lucide-react";

export default function ClickAnalytics() {
  const { data: clickData, isLoading } = trpc.clicks.list.useQuery();
  
  // Group clicks by URL
  const clicksByUrl = clickData?.reduce((acc: any, click: any) => {
    const url = click.originalUrl;
    if (!acc[url]) {
      acc[url] = {
        url,
        clicks: [],
        count: 0,
      };
    }
    acc[url].clicks.push(click);
    acc[url].count++;
    return acc;
  }, {});
  
  const urlStats = clicksByUrl ? Object.values(clicksByUrl).sort((a: any, b: any) => b.count - a.count) : [];
  
  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="container py-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Click Tracking</h1>
          <p className="text-muted-foreground text-lg">
            See which links in your emails are being clicked and by which leads
          </p>
        </div>

        {/* Overview Statistics */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clickData?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all emails
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Links</CardTitle>
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{urlStats.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Different URLs clicked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Leads</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {new Set(clickData?.filter((c: any) => c.leadId).map((c: any) => c.leadId)).size || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Leads who clicked
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Most Clicked Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Most Clicked Links
            </CardTitle>
            <CardDescription>
              See which links are getting the most engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {urlStats.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MousePointerClick className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No click data available yet</p>
                <p className="text-sm mt-2">Send emails with links to start tracking clicks</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 pb-2 border-b font-medium text-sm">
                  <div className="col-span-2">URL</div>
                  <div className="text-right">Clicks</div>
                </div>
                {urlStats.map((stat: any, index: number) => (
                  <div key={index} className="grid grid-cols-3 gap-4 py-3 border-b last:border-0">
                    <div className="col-span-2 font-mono text-sm truncate" title={stat.url}>
                      {stat.url}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-blue-600">{stat.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clicks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5" />
              Recent Clicks
            </CardTitle>
            <CardDescription>
              Latest click activity across all emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!clickData || clickData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MousePointerClick className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No click data available yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 pb-2 border-b font-medium text-sm">
                  <div className="col-span-2">URL</div>
                  <div>Email Subject</div>
                  <div className="text-right">Clicked At</div>
                </div>
                {clickData.slice(0, 20).map((click: any) => (
                  <div key={click.id} className="grid grid-cols-4 gap-4 py-3 border-b last:border-0">
                    <div className="col-span-2 font-mono text-sm truncate" title={click.originalUrl}>
                      {click.originalUrl}
                    </div>
                    <div className="text-muted-foreground text-sm truncate">
                      {click.subject || 'N/A'}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {new Date(click.clickedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
