import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Activity, Calendar, CheckCircle2, Clock, Pause, Play, Trash2, XCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  
  // Fetch data
  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = trpc.admin.listScheduledJobs.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.admin.getJobStatistics.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.admin.getExecutionHistory.useQuery({ limit: 20 });
  
  // Mutations
  const pauseJobMutation = trpc.admin.pauseJob.useMutation({
    onSuccess: () => {
      toast.success("Job paused successfully");
      refetchJobs();
    },
    onError: (error) => {
      toast.error(`Failed to pause job: ${error.message}`);
    },
  });
  
  const resumeJobMutation = trpc.admin.resumeJob.useMutation({
    onSuccess: () => {
      toast.success("Job resumed successfully");
      refetchJobs();
    },
    onError: (error) => {
      toast.error(`Failed to resume job: ${error.message}`);
    },
  });
  
  const deleteJobMutation = trpc.admin.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Job deleted successfully");
      refetchJobs();
    },
    onError: (error) => {
      toast.error(`Failed to delete job: ${error.message}`);
    },
  });
  
  const handlePauseJob = (jobId: number) => {
    pauseJobMutation.mutate({ jobId });
  };
  
  const handleResumeJob = (jobId: number) => {
    resumeJobMutation.mutate({ jobId });
  };
  
  const handleDeleteJob = (jobId: number) => {
    if (confirm("Are you sure you want to delete this scheduled job?")) {
      deleteJobMutation.mutate({ jobId });
    }
  };
  
  const formatCronExpression = (cron: string) => {
    // Simple cron expression formatter
    if (cron === "0 9 * * *") return "Daily at 9:00 AM";
    if (cron === "0 */1 * * *") return "Every hour";
    if (cron === "0 */6 * * *") return "Every 6 hours";
    if (cron === "0 9 * * 1") return "Weekly on Monday at 9:00 AM";
    if (cron === "0 0 1 * *") return "Monthly on 1st at midnight";
    return cron;
  };
  
  const formatDate = (date: Date | string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Success</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Please log in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }
  
  const isLoading = jobsLoading || statsLoading || historyLoading;
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Scheduled Jobs Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage automated workflow execution schedules
          </p>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalJobs || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeJobs || 0} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalExecutions || 0}</div>
              <p className="text-xs text-muted-foreground">
                All time runs
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.successRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {stats?.successfulExecutions || 0} successful
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Executions</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.failedExecutions || 0}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Scheduled Jobs Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Scheduled Jobs</CardTitle>
            <CardDescription>
              Active and paused automation schedules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : jobs && jobs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Type</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Executed</TableHead>
                    <TableHead>Executions</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const totalExec = job.totalExecutions || 0;
                    const successExec = job.successfulExecutions || 0;
                    const successRate = totalExec > 0
                      ? Math.round((successExec / totalExec) * 100)
                      : 0;
                    
                    return (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.jobType}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatCronExpression(job.cronExpression)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {job.isActive === 1 ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                              Paused
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(job.lastExecutedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{job.totalExecutions}</span>
                            <span className="text-xs text-muted-foreground">
                              ({job.successfulExecutions}✓ / {job.failedExecutions}✗)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500"
                                style={{ width: `${successRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{successRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {job.isActive === 1 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePauseJob(job.id)}
                                disabled={pauseJobMutation.isPending}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResumeJob(job.id)}
                                disabled={resumeJobMutation.isPending}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteJob(job.id)}
                              disabled={deleteJobMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled jobs found</p>
                <p className="text-sm mt-2">Jobs will appear here when you schedule automated workflows</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Execution History */}
        <Card>
          <CardHeader>
            <CardTitle>Execution History</CardTitle>
            <CardDescription>
              Recent workflow execution results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : history && history.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Executed At</TableHead>
                    <TableHead>Leads Detected</TableHead>
                    <TableHead>Leads Enrolled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell className="font-medium">
                        {execution.workflowName || `Workflow #${execution.workflowId}`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(execution.executedAt)}
                      </TableCell>
                      <TableCell>{execution.leadsDetected}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>{execution.leadsEnrolled}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(execution.status)}</TableCell>
                      <TableCell className="text-sm text-red-500">
                        {execution.errorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No execution history found</p>
                <p className="text-sm mt-2">Execution records will appear here after workflows run</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
