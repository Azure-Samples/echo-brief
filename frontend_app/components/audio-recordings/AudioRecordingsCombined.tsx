"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOBS_API } from "@/lib/apiConstants";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCcw, Eye, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AudioRecordingsProvider } from "@/components/audio-recordings/audio-recordings-context";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ViewDetailsDialog } from "./view-details-dialog";
import { useRouter } from "next/navigation";

const statusEnum = z.enum(["all", "uploaded", "processing", "completed", "failed"]);

const filterSchema = z.object({
  job_id: z.string().optional(),
  status: statusEnum.default("all"),
  created_at: z.string().optional(),
});

export type FilterValues = z.infer<typeof filterSchema>;

export function AudioRecordingsCombined({ initialFilters }: { initialFilters: FilterValues }) {
  const [audioRecordings, setAudioRecordings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const [selectedRecording, setSelectedRecording] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const hasFetchedData = useRef(false);
  const router = useRouter();

  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: { ...initialFilters, created_at: "" },
  });

  const safeGetLocalStorage = (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return null;
    }
  };

  const safeSetLocalStorage = (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Error setting localStorage:', e);
    }
  };

  const fetchJobData = useCallback(
    async (forceRefresh = false, filters?: FilterValues) => {
      if (!forceRefresh) {
        const cachedJobs = safeGetLocalStorage("cachedJobs");
        if (cachedJobs) {
          try {
            setAudioRecordings(JSON.parse(cachedJobs));
            setIsLoading(false);
            return;
          } catch (e) {
            console.error('Error parsing cached jobs:', e);
            // Continue to fetch from API
          }
        }
      }

      setIsLoading(true);
      try {
        const token = safeGetLocalStorage("token");
        if (!token) throw new Error("No authentication token found. Please log in again.");

        const params = new URLSearchParams({
          job_id: filters?.job_id || "",
          status: filters?.status && filters.status !== "all" ? filters.status : "",
          created_at: filters?.created_at || "",
        });

        const response = await fetch(`${JOBS_API}?${params.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        setAudioRecordings(data.jobs || []);
        safeSetLocalStorage("cachedJobs", JSON.stringify(data.jobs || []));
      } catch (error) {
        console.error("Error fetching audio recordings:", error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!hasFetchedData.current) {
      hasFetchedData.current = true;
      fetchJobData();
    }
  }, [fetchJobData]);

  // Refresh Handler (Keep Filters)
  const handleRefresh = async () => {
    setLoadingRefresh(true);
    await fetchJobData(true, form.getValues());
    setLoadingRefresh(false);
  };

  // Reset button handler - clears filters 
  const handleReset = async () => {
    setLoadingReset(true);
    form.reset({ job_id: "", status: "all", created_at: "" });
    await fetchJobData(true);
    setLoadingReset(false);
  };

  // Pagination Logic
  const totalPages = Math.ceil(audioRecordings.length / recordsPerPage);
  const paginatedData = audioRecordings.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);
  const statusVariants: Record<string, string> = {
    completed: "bg-green-500 text-white",
    processing: "bg-yellow-500 text-black",
    uploaded: "bg-blue-500 text-white",
    failed: "bg-red-500 text-white",
    default: "bg-gray-400 text-white",
  };

  return (
    <AudioRecordingsProvider>
      <Card className="max-w-5xl mx-auto mt-8 p-6 w-full">
        <CardHeader>
          <CardTitle>Audio Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="job_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job ID</FormLabel>
                    <FormControl><Input placeholder="Enter Job ID" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        {statusEnum.options.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="created_at" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Date</FormLabel>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            onClick={() => setIsDatePickerOpen(true)}
                          >
                            {field.value ? format(new Date(field.value), "yyyy-MM-dd") : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
                            field.onChange(formattedDate);
                            setIsDatePickerOpen(false);
                          }} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={handleReset} disabled={loadingReset}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  {loadingReset ? "Resetting..." : "Reset"}
                </Button>
                <Button variant="outline" onClick={handleRefresh} disabled={loadingRefresh}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  {loadingRefresh ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </form>
          </Form>

          {isLoading && <Progress value={90} className="mt-4 mb-4" />}


          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Actions</TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell className="text-blue-500 font-medium">
                      {row.file_name || row.file_path.split('/').pop() || 'Unnamed Recording'}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("px-4 py-1 text-xs rounded-md min-w-[100px] flex items-center justify-center", statusVariants[row.status] || statusVariants.default)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(parseInt(row.created_at)).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {/* Action Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setSelectedRecording(row)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        {selectedRecording && selectedRecording.id === row.id && (
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              // For static export, we need to use one of our pre-generated paths
                              // In a real app with SSR, you would use the actual row.id
                              
                              // Check if this is one of our pre-generated paths
                              const isPlaceholder = row.id.startsWith('job_placeholder_');
                              
                              if (isPlaceholder) {
                                router.push(`/audio-recordings/${row.id}`);
                              } else {
                                // If not a placeholder, route to the first placeholder ID but store the real ID in localStorage
                                // for client-side fetching once the page loads
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('current_recording_id', row.id);
                                }
                                router.push(`/audio-recordings/job_placeholder_123456789`);
                              }
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {row.status === "uploaded" && (
                              <DropdownMenuItem onClick={() => null}>
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Retry Processing
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        )}
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    No results found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

          </Table>

          {/* Pagination Controls*/}
          <div className="flex justify-between mt-4">
            <Button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
            <span>Page {currentPage} of {totalPages}</span>
            <Button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= totalPages}>Next</Button>
          </div>
          {selectedRecording && (
            <ViewDetailsDialog
              recording={selectedRecording}
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setSelectedRecording(null);
              }}
            />
          )}
        </CardContent>
      </Card>
    </AudioRecordingsProvider>
  );
}