"use client"

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { JOBS_API } from '@/lib/apiConstants';

export interface AudioRecording {
  id: string;
  user_id: string;
  file_path: string;
  transcription_file_path: string | null;
  analysis_file_path: string | null;
  prompt_category_id: string;
  prompt_subcategory_id: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  transcription_id: string | null;
  created_at: number;
  updated_at: number;
  type: string;
  _rid: string;
  _self: string;
  _etag: string;
  _attachments: string;
  _ts: number;
}

interface AudioRecordingsContextType {
  audioRecordings: AudioRecording[];
  fetchAudioRecordings: () => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

const AudioRecordingsContext = createContext<AudioRecordingsContextType | undefined>(undefined);

export function AudioRecordingsProvider({ children }: { children: React.ReactNode }) {
  const [audioRecordings, setAudioRecordings] = useState<AudioRecording[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper function to safely access localStorage (not available during SSR)
  const safeGetLocalStorage = (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return null;
    }
  };

  // Helper function to safely set localStorage
  const safeSetLocalStorage = (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Error setting localStorage:', e);
    }
  };

  const fetchAudioRecordings = useCallback(async () => {
    setIsLoading(true);
    
    const cachedData = safeGetLocalStorage('audioRecordingsData');
    if (cachedData) {
      try {
        setAudioRecordings(JSON.parse(cachedData));
        setIsLoading(false);
        return; // Exit if cached data is available
      } catch (e) {
        console.error('Error parsing cached data:', e);
        // Continue to fetch from API if cache parsing fails
      }
    }

    try {
      const token = safeGetLocalStorage('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch(JOBS_API, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', response.status, errorText);
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
      }

      const data = await response.json();
      safeSetLocalStorage('audioRecordingsData', JSON.stringify(data.jobs || []));
      safeSetLocalStorage('cachedJobs', JSON.stringify(data.jobs || [])); // Also update cachedJobs for compatibility
      setAudioRecordings(data.jobs || []);
    } catch (error) {
      console.error('Error fetching audio recordings:', error);
      
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch recordings when the provider mounts
  useEffect(() => {
    fetchAudioRecordings();
  }, [fetchAudioRecordings]);

  return (
    <AudioRecordingsContext.Provider value={{ audioRecordings, fetchAudioRecordings, error, isLoading }}>
      {children}
    </AudioRecordingsContext.Provider>
  );
}

export function useAudioRecordings() {
  const context = useContext(AudioRecordingsContext);
  if (context === undefined) {
    throw new Error('useAudioRecordings must be used within an AudioRecordingsProvider');
  }
  return context;
}