import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  History, 
  Star, 
  Trash2, 
  Search, 
  Building2, 
  MapPin, 
  Users,
  RotateCcw,
  Loader2,
  X
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchHistoryProps {
  onRerunSearch: (query: string, industry?: string, companySize?: string, location?: string) => void;
  isSearching?: boolean;
}

export default function SearchHistory({ onRerunSearch, isSearching }: SearchHistoryProps) {
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  
  const utils = trpc.useUtils();
  
  const { data: allHistory, isLoading: loadingAll } = trpc.searchHistory.list.useQuery({});
  const { data: favorites, isLoading: loadingFavorites } = trpc.searchHistory.favorites.useQuery();
  
  const toggleFavoriteMutation = trpc.searchHistory.toggleFavorite.useMutation({
    onSuccess: (data, variables) => {
      utils.searchHistory.list.invalidate();
      utils.searchHistory.favorites.invalidate();
      toast.success(data.isFavorite ? "Added to favorites" : "Removed from favorites");
    },
    onError: (error) => {
      toast.error(`Failed to update favorite: ${error.message}`);
    },
  });
  
  const deleteMutation = trpc.searchHistory.delete.useMutation({
    onSuccess: () => {
      utils.searchHistory.list.invalidate();
      utils.searchHistory.favorites.invalidate();
      toast.success("Search deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
  
  const clearMutation = trpc.searchHistory.clear.useMutation({
    onSuccess: () => {
      utils.searchHistory.list.invalidate();
      utils.searchHistory.favorites.invalidate();
      toast.success("History cleared");
    },
    onError: (error) => {
      toast.error(`Failed to clear history: ${error.message}`);
    },
  });
  
  const handleRerun = (item: any) => {
    let filters: any = {};
    try {
      if (item.filters) {
        filters = JSON.parse(item.filters);
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    onRerunSearch(
      item.query,
      item.industry || filters.industry,
      item.companySize || filters.companySize,
      item.location || filters.location
    );
  };
  
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };
  
  const displayHistory = activeTab === "favorites" ? favorites : allHistory;
  const isLoading = activeTab === "favorites" ? loadingFavorites : loadingAll;
  
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Search History</CardTitle>
          </div>
          {allHistory && allHistory.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Search History</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all your search history. Your favorite searches will be preserved.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearMutation.mutate({ keepFavorites: true })}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <CardDescription>
          Quickly re-run previous searches or save your favorites
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "favorites")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              All ({allHistory?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Favorites ({favorites?.length || 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !displayHistory || displayHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {activeTab === "favorites" 
                    ? "No favorite searches yet. Star a search to save it here."
                    : "No search history yet. Start discovering leads!"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {displayHistory.map((item) => {
                  let filters: any = {};
                  try {
                    if (item.filters) {
                      filters = JSON.parse(item.filters);
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                  
                  const industry = item.industry || filters.industry;
                  const companySize = item.companySize || filters.companySize;
                  const location = item.location || filters.location;
                  
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group relative p-3 rounded-lg border border-border/50 bg-background/50",
                        "hover:border-primary/30 hover:bg-background transition-all duration-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{item.query}</p>
                            {item.resultsCount !== null && item.resultsCount !== undefined && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {item.resultsCount} results
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {industry && industry !== "any" && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {industry}
                              </span>
                            )}
                            {companySize && companySize !== "any" && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {companySize}
                              </span>
                            )}
                            {location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {location}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8",
                              item.isFavorite === 1 
                                ? "text-yellow-500 hover:text-yellow-600" 
                                : "text-muted-foreground hover:text-yellow-500"
                            )}
                            onClick={() => toggleFavoriteMutation.mutate({ id: item.id })}
                            disabled={toggleFavoriteMutation.isPending}
                          >
                            <Star className={cn("h-4 w-4", item.isFavorite === 1 && "fill-current")} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleRerun(item)}
                            disabled={isSearching}
                          >
                            {isSearching ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteMutation.mutate({ id: item.id })}
                            disabled={deleteMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
