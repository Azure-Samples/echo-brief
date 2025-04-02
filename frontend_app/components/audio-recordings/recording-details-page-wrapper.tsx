"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RecordingDetailsPage } from "@/components/audio-recordings/recording-details-page";
import { AudioRecording } from "@/components/audio-recordings/audio-recordings-context";
import { JOBS_API } from "@/lib/apiConstants";

interface RecordingDetailsPageWrapperProps {
  id: string;
}

export function RecordingDetailsPageWrapper({ id }: RecordingDetailsPageWrapperProps) {
  const router = useRouter();
  const [recording, setRecording] = useState<AudioRecording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Helper function to safely access localStorage
  const safeGetLocalStorage = (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error("Error accessing localStorage:", e);
      return null;
    }
  };

  // First, check if we're running on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return; // Skip data fetching during static generation
    
    // For static export, check if we have a current_recording_id in localStorage
    // This would mean we're viewing a real recording through a placeholder route
    const currentRecordingId = safeGetLocalStorage("current_recording_id");
    const actualId = currentRecordingId || id; // Use the stored ID or the route ID
    
    // Clear the current_recording_id from localStorage
    if (currentRecordingId && typeof window !== 'undefined') {
      localStorage.removeItem("current_recording_id");
    }
    
    // Function to fetch a single recording by ID from the API
    const fetchRecordingById = async (recordingId: string) => {
      try {
        const token = safeGetLocalStorage("token");
        if (!token) {
          throw new Error("Authentication required");
        }

        // Optional: If your API supports fetching a single recording by ID
        const response = await fetch(`${JOBS_API}/${recordingId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setRecording(data.job);
          setIsLoading(false);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error fetching recording by ID:", error);
        return false;
      }
    };

    const getRecordingFromCache = () => {
      try {
        // Try to get the recording from the cached data
        const cachedJobs = safeGetLocalStorage("cachedJobs");
        
        if (cachedJobs) {
          const jobs = JSON.parse(cachedJobs) as AudioRecording[];
          const job = jobs.find((job: AudioRecording) => job.id === actualId);
          
          if (job) {
            setRecording(job);
            setIsLoading(false);
            return true;
          }
        }
        return false;
      } catch (e) {
        console.error("Error parsing cached jobs:", e);
        return false;
      }
    };

    const loadRecording = async () => {
      // Try first from cache
      const foundInCache = getRecordingFromCache();
      if (foundInCache) return;

      // If not in cache, try from API
      const foundFromApi = await fetchRecordingById(actualId);
      if (foundFromApi) return;

      // If we've reached here, we couldn't find the recording
      setError("Recording not found. Please try again from the recordings list.");
      setIsLoading(false);
      
      // Optional: Redirect back after a delay
      setTimeout(() => {
        router.push("/audio-recordings");
      }, 3000);
    };

    loadRecording();
  }, [id, router, isClient]);

  // For static generation, show a skeleton loading state
  if (!isClient) {
    return <div className="container mx-auto py-6 px-4">Loading recording details...</div>;
  }

  if (isLoading) {
    return <div className="container mx-auto py-6 px-4">Loading recording details...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p className="mt-2">
            <button 
              onClick={() => router.push("/audio-recordings")}
              className="text-blue-500 underline"
            >
              Return to recordings list
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (!recording) {
    return <div className="container mx-auto py-6 px-4">Recording not found</div>;
  }

  return <RecordingDetailsPage recording={recording} />;
} 