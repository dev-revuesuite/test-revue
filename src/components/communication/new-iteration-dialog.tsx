"use client";

import { useState, useRef } from "react";
import { X, Upload, Info, FileImage, Trash2, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NewIterationDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  currentIteration: number;
  isFirstIteration?: boolean;
}

export function NewIterationDialog({
  open,
  onClose,
  onUpload,
  currentIteration,
  isFirstIteration = false,
}: NewIterationDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (selectedFile) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#DBFE52] to-[#c8eb3d] rounded-xl flex items-center justify-center shadow-sm">
              <Upload className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isFirstIteration ? "Upload Your Design" : "New Iteration"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {isFirstIteration
                  ? "Upload the first design to get started"
                  : `Upload to create Version ${currentIteration + 1}`
                }
              </p>
            </div>
          </div>
          {!isFirstIteration && (
            <button
              onClick={handleClose}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative rounded-xl border-2 border-dashed transition-all cursor-pointer",
              isDragging
                ? "border-[#5C6ECD] bg-[#5C6ECD]/5 scale-[1.01]"
                : "border-gray-200 dark:border-[#3a3a3a] hover:border-[#5C6ECD] hover:bg-gray-50 dark:hover:bg-[#252525]",
              preview ? "p-4" : "py-12 px-6"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />

            {preview ? (
              <div className="relative">
                <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-[#2a2a2a]">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-[280px] object-contain mx-auto"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg shadow-lg transition-colors backdrop-blur-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
                  <div className="w-10 h-10 bg-[#5C6ECD]/10 rounded-lg flex items-center justify-center">
                    <FileImage className="w-5 h-5 text-[#5C6ECD]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#5C6ECD]/10 to-[#5C6ECD]/5">
                  <CloudUpload className="w-8 h-8 text-[#5C6ECD]" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                  Drop your image here
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  or click to browse files
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-[#2a2a2a] rounded">PNG</span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-[#2a2a2a] rounded">JPG</span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-[#2a2a2a] rounded">WebP</span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span>Max 25MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-blue-50/70 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {isFirstIteration
                ? "Upload your design to start collecting feedback and collaborating with your team."
                : `This creates Iteration ${currentIteration + 1}. Previous feedbacks stay with v${currentIteration}.`
              }
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2a2a] bg-gray-50/50 dark:bg-[#1a1a1a]">
          {!isFirstIteration && (
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile}
            className={cn(
              "gap-2 font-medium",
              !selectedFile
                ? "bg-gray-200 dark:bg-[#333] text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-[#DBFE52] hover:bg-[#d0f043] text-black shadow-sm"
            )}
          >
            <Upload className="w-4 h-4" />
            {isFirstIteration ? "Upload & Get Started" : `Create Iteration ${currentIteration + 1}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
