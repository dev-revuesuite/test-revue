"use client";

import { useState, useRef } from "react";
import { X, Upload, Image, AlertCircle, CheckCircle2, FileImage, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UnresolvedFeedback {
  id: string;
  number: string;
  content: string;
}

interface NewIterationDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  currentIteration: number;
  unresolvedFeedbacks: UnresolvedFeedback[];
}

export function NewIterationDialog({
  open,
  onClose,
  onUpload,
  currentIteration,
  unresolvedFeedbacks,
}: NewIterationDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUnresolvedFeedbacks = unresolvedFeedbacks.length > 0;

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = () => {
    if (selectedFile && !hasUnresolvedFeedbacks) {
      onUpload(selectedFile);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    onClose();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#333]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#DBFE52] flex items-center justify-center">
              <Upload className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upload New Iteration
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This will create Iteration {currentIteration + 1}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning for unresolved feedbacks */}
          {hasUnresolvedFeedbacks && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Resolve feedbacks first
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    You have {unresolvedFeedbacks.length} unresolved feedback{unresolvedFeedbacks.length > 1 ? "s" : ""} on the current iteration.
                    Please resolve them before uploading a new iteration.
                  </p>
                  <div className="mt-3 space-y-2 max-h-[120px] overflow-y-auto">
                    {unresolvedFeedbacks.map((feedback) => (
                      <div
                        key={feedback.id}
                        className="flex items-center gap-2 p-2 bg-white/50 dark:bg-black/20"
                      >
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                          {feedback.number}
                        </span>
                        <span className="text-sm text-amber-800 dark:text-amber-200 truncate">
                          {feedback.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !hasUnresolvedFeedbacks && fileInputRef.current?.click()}
            className={cn(
              "relative border-2 border-dashed transition-all",
              hasUnresolvedFeedbacks
                ? "border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a] cursor-not-allowed opacity-50"
                : isDragging
                ? "border-[#5C6ECD] bg-[#5C6ECD]/5"
                : "border-gray-300 dark:border-[#444] hover:border-[#5C6ECD] cursor-pointer",
              preview ? "p-4" : "p-12"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
              disabled={hasUnresolvedFeedbacks}
            />

            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-[300px] object-contain mx-auto"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="mt-4 flex items-center justify-center gap-3 p-3 bg-gray-100 dark:bg-[#2a2a2a]">
                  <FileImage className="w-5 h-5 text-[#5C6ECD]" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-[#2a2a2a] rounded-full flex items-center justify-center">
                  <Image className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  {hasUnresolvedFeedbacks ? "Upload disabled" : "Drop your image here"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {hasUnresolvedFeedbacks
                    ? "Resolve all feedbacks to enable upload"
                    : "or click to browse from your computer"
                  }
                </p>
                {!hasUnresolvedFeedbacks && (
                  <p className="text-xs text-gray-400">
                    Supports: PNG, JPG, GIF, WebP (max 25MB)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">What happens when you upload:</p>
              <ul className="mt-1 space-y-1 text-blue-700 dark:text-blue-300">
                <li>• A new Iteration {currentIteration + 1} will be created</li>
                <li>• Previous feedbacks will be archived with Iteration {currentIteration}</li>
                <li>• Team members will be notified of the new version</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a]">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-300 dark:border-[#444]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || hasUnresolvedFeedbacks}
            className="bg-[#DBFE52] hover:bg-[#d0f043] text-black gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            Upload & Create Iteration {currentIteration + 1}
          </Button>
        </div>
      </div>
    </div>
  );
}
