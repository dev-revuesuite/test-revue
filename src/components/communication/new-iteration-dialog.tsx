"use client";

import { useEffect, useRef, useState } from "react";
import {
  CloudUpload,
  FileImage,
  FileText,
  Info,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isPdfFile, type MediaType } from "@/lib/media-type";
import { getPdfPageCountFromUrl } from "@/lib/pdf-page-count";

interface NewIterationDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => void | Promise<void>;
  currentIteration: number;
  isFirstIteration?: boolean;
  /**
   * Locks the dialog to a single media type so iterations of the same creative
   * stay consistent (PDF creative ⇒ PDF only, image creative ⇒ image only).
   * Undefined = accept both (used for the very first upload).
   */
  allowedMediaType?: MediaType;
}

const MAX_FILE_MB = 50;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export function NewIterationDialog({
  open,
  onClose,
  onUpload,
  currentIteration,
  isFirstIteration = false,
  allowedMediaType,
}: NewIterationDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType | null>(
    null
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptAttribute =
    allowedMediaType === "pdf"
      ? ".pdf,application/pdf"
      : allowedMediaType === "image"
        ? "image/*"
        : "image/*,.pdf,application/pdf";

  const formatChips =
    allowedMediaType === "pdf"
      ? ["PDF"]
      : allowedMediaType === "image"
        ? ["PNG", "JPG", "WebP"]
        : ["PNG", "JPG", "WebP", "PDF"];

  const dropHeading =
    allowedMediaType === "pdf"
      ? "Drop your PDF here"
      : allowedMediaType === "image"
        ? "Drop your image here"
        : "Drop your file here";

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  const resetSelection = () => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setSelectedFile(null);
    setSelectedMediaType(null);
    setPreview(null);
    setPdfBlobUrl(null);
    setPdfPageCount(null);
  };

  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);

    const isPdf = isPdfFile(file);
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      setErrorMessage("Unsupported file type. Please upload an image or PDF.");
      return;
    }

    if (allowedMediaType === "pdf" && !isPdf) {
      setErrorMessage(
        "This creative is a PDF — please upload a PDF file for the new iteration."
      );
      return;
    }

    if (allowedMediaType === "image" && !isImage) {
      setErrorMessage(
        "This creative is an image — please upload an image file for the new iteration."
      );
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage(`File is larger than ${MAX_FILE_MB}MB.`);
      return;
    }

    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setSelectedFile(file);
    setPdfPageCount(null);

    if (isPdf) {
      setSelectedMediaType("pdf");
      setPreview(null);
      const blobUrl = URL.createObjectURL(file);
      setPdfBlobUrl(blobUrl);
      try {
        const count = await getPdfPageCountFromUrl(blobUrl);
        setPdfPageCount(count);
      } catch {
        setPdfPageCount(null);
      }
    } else {
      setSelectedMediaType("image");
      setPdfBlobUrl(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFileSelect(file);
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
    if (file) void handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    setErrorMessage(null);
    try {
      await onUpload(selectedFile);
      resetSelection();
      onClose();
    } catch (err) {
      console.error("Iteration upload failed:", err);
      setErrorMessage("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    resetSelection();
    setErrorMessage(null);
    onClose();
  };

  const clearFile = () => {
    resetSelection();
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
                  : `Upload to create Version ${currentIteration + 1}`}
              </p>
            </div>
          </div>
          {!isFirstIteration && (
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              selectedFile ? "p-4" : "py-12 px-6"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttribute}
              onChange={handleInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="relative">
                {selectedMediaType === "image" && preview ? (
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
                ) : (
                  <div className="relative rounded-lg bg-gradient-to-br from-[#f8f9ff] via-white to-[#f0f4ff] dark:from-[#1a1a1a] dark:via-[#0f0f0f] dark:to-[#0d0f1a] border border-gray-100 dark:border-[#2a2a2a] py-10 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-[#5C6ECD]/10 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-[#5C6ECD]" />
                    </div>
                    <span className="text-xs font-semibold text-[#5C6ECD] tracking-wide">
                      PDF
                    </span>
                    {pdfPageCount != null && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {pdfPageCount === 1
                          ? "1 page"
                          : `${pdfPageCount} pages`}
                      </span>
                    )}
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
                )}
                <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
                  <div className="w-10 h-10 bg-[#5C6ECD]/10 rounded-lg flex items-center justify-center">
                    {selectedMediaType === "pdf" ? (
                      <FileText className="w-5 h-5 text-[#5C6ECD]" />
                    ) : (
                      <FileImage className="w-5 h-5 text-[#5C6ECD]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      {selectedMediaType === "pdf" && pdfPageCount != null && (
                        <>
                          {" · "}
                          {pdfPageCount === 1
                            ? "1 page"
                            : `${pdfPageCount} pages`}
                        </>
                      )}
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
                  {dropHeading}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  or click to browse files
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
                  {formatChips.map((chip) => (
                    <span
                      key={chip}
                      className="px-2 py-1 bg-gray-100 dark:bg-[#2a2a2a] rounded"
                    >
                      {chip}
                    </span>
                  ))}
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span>Max {MAX_FILE_MB}MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {errorMessage && (
            <div
              role="alert"
              className="mt-3 px-4 py-2.5 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/50 rounded-lg"
            >
              {errorMessage}
            </div>
          )}

          {/* Info Banner */}
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-blue-50/70 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {isFirstIteration
                ? "Upload your design to start collecting feedback and collaborating with your team."
                : `This creates Iteration ${currentIteration + 1}. Previous feedbacks stay with v${currentIteration}.`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2a2a] bg-gray-50/50 dark:bg-[#1a1a1a]">
          {!isFirstIteration && (
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isUploading}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={cn(
              "gap-2 font-medium",
              !selectedFile || isUploading
                ? "bg-gray-200 dark:bg-[#333] text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-[#DBFE52] hover:bg-[#d0f043] text-black shadow-sm"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {isFirstIteration
                  ? "Upload & Get Started"
                  : `Create Iteration ${currentIteration + 1}`}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
