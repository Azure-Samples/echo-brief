"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AudioRecording } from "./audio-recordings-context";
import { FileAudio, FileText, FileIcon as FilePdf, Calendar, User, Tag, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Add the analysis_text property to extend the AudioRecording type
interface ExtendedAudioRecording extends AudioRecording {
  analysis_text?: string;
}

interface ViewDetailsDialogProps {
  recording: ExtendedAudioRecording;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusStyles: Record<string, string> = {
  completed: "bg-green-500 text-white border border-green-700 shadow-md px-4 py-1 rounded-full",
  processing: "bg-yellow-500 text-black border border-yellow-600 shadow-md px-4 py-1 rounded-full",
  uploaded: "bg-blue-500 text-white border border-blue-700 shadow-md px-4 py-1 rounded-full",
  failed: "bg-red-500 text-white border border-red-700 shadow-md px-4 py-1 rounded-full",
  error: "bg-red-500 text-white border border-red-700 shadow-md px-4 py-1 rounded-full",
  default: "bg-gray-500 text-white border border-gray-600 shadow-md px-4 py-1 rounded-full",
};

export function ViewDetailsDialog({ recording, open, onOpenChange }: ViewDetailsDialogProps) {
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);

  useEffect(() => {
    if (!recording.transcription_file_path) return;
    fetch(recording.transcription_file_path)
      .then((response) => response.text())
      .then((text) => setTranscriptionText(text))
      .catch(() => setTranscriptionText("⚠️ Failed to load transcription."));
  }, [recording.transcription_file_path]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[90vh] max-w-[95vw] rounded-xl shadow-lg bg-white dark:bg-gray-900 text-black dark:text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Audio Recording Details</DialogTitle>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FileAudio className="mr-2" /> Recording
            </h3>
            <div className="bg-gray-200 dark:bg-gray-800 p-3 rounded-lg shadow-md">
              <audio controls className="w-full rounded-lg">
                <source src={recording.file_path} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
            <Button onClick={() => window.open(recording.file_path, "_blank")} variant="outline" className="w-full font-semibold rounded-lg mt-2">
              Download Audio
            </Button>
          </div>

          <Separator className="my-4 border-gray-300 dark:border-gray-700" />

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="flex flex-col">
              <h3 className="text-gray-600 dark:text-gray-400 flex items-center mb-1">
                <Tag className="mr-2" /> Job ID
              </h3>
              <p className="font-medium text-gray-900 dark:text-white">{recording.id}</p>
            </div>
            <div>
              <h3 className="text-gray-600 dark:text-gray-400 flex items-center mb-1">
                <User className="mr-2" /> User ID
              </h3>
              <p className="font-medium">{recording.user_id}</p>
            </div>
            <div className="col-span-2 flex items-center justify-between mt-4">
              <div>
                <h3 className="text-gray-600 dark:text-gray-400 flex items-center mb-1">
                  <RefreshCw className="mr-2" /> Status
                </h3>
                <Badge className={cn("px-4 py-1 text-sm font-semibold flex justify-center items-center", statusStyles[recording.status] || statusStyles.default)}>
                  {recording.status.charAt(0).toUpperCase() + recording.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="my-4 border-gray-300 dark:border-gray-700" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="text-gray-600 dark:text-gray-400 flex items-center mb-1">
                <Calendar className="mr-2" /> Created At
              </h3>
              <p className="font-medium">{new Date(recording.created_at).toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-gray-600 dark:text-gray-400 flex items-center mb-1">
                <Calendar className="mr-2" /> Updated At
              </h3>
              <p className="font-medium">{new Date(recording.updated_at).toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-gray-400">Prompt Category ID</h3>
              <p className="font-medium">{recording.prompt_category_id || "N/A"}</p>
            </div>
            <div>
              <h3 className="text-gray-400">Prompt Subcategory ID</h3>
              <p className="font-medium">{recording.prompt_subcategory_id || "N/A"}</p>
            </div>
          </div>

          {recording.transcription_file_path && (
            <>
              <Separator className="my-4 border-gray-300 dark:border-gray-700" />
              <div className="mb-2">
                <h3 className="text-md font-semibold flex items-center mb-1">
                  <FileText className="mr-2" /> Transcription
                </h3>
                {transcriptionText ? (
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {transcriptionText}
                  </div>
                ) : (
                  <p>Loading...</p>
                )}
                <Button 
                  onClick={() => recording.transcription_file_path && window.open(recording.transcription_file_path, "_blank")} 
                  variant="outline" 
                  className="w-full font-semibold rounded-lg shadow-md mt-2"
                  disabled={!recording.transcription_file_path}
                >
                  Download Transcription TXT
                </Button>
              </div>
            </>
          )}

          {recording.analysis_text && (
            <>
              <Separator className="my-4 border-gray-300 dark:border-gray-700" />

              <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
                <h3 className="text-lg font-bold flex items-center mb-2">
                  <FileText className="mr-2" /> Analysis Summary
                </h3>

                {recording.analysis_text.split("\n\n").map((section: string, index: number) => {
                  const lines = section.split("\n");
                  const title = lines[0];
                  const content = lines.slice(1);

                  return (
                    <div key={index} className="mt-4">
                      <h4 className="text-md font-semibold">{title}</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mt-2">
                        {content.map((point: string, subIndex: number) => (
                          <li key={subIndex}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <Button 
                onClick={() => recording.analysis_file_path && window.open(recording.analysis_file_path, "_blank")} 
                variant="outline" 
                className="w-full font-semibold rounded-lg shadow-md mt-2"
                disabled={!recording.analysis_file_path}
              >
                Download Analysis PDF
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}