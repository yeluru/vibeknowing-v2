"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileUpload() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setUploading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("http://localhost:8001/ingest/file", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to upload file");
            }

            const data = await response.json();
            setSuccess(`Successfully uploaded "${file.name}"! Redirecting...`);

            // Redirect to the new source page after a short delay
            setTimeout(() => {
                if (data.id) {
                    window.location.href = `/source/${data.id}`;
                } else {
                    window.location.reload();
                }
            }, 1500);
        } catch (err) {
            console.error("Upload error:", err);
            setError(err instanceof Error ? err.message : "Failed to upload file");
        } finally {
            setUploading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxFiles: 1,
        multiple: false
    });

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                {...getRootProps()}
                className={cn(
                    "relative flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-xl transition-all cursor-pointer",
                    isDragActive
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-300 bg-white hover:border-purple-400 hover:bg-gray-50",
                    uploading && "opacity-50 pointer-events-none"
                )}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className={cn(
                        "p-4 rounded-full",
                        isDragActive ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"
                    )}>
                        {uploading ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                            <Upload className="w-8 h-8" />
                        )}
                    </div>

                    <div className="space-y-1">
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                            {isDragActive ? "Drop the file here" : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            PDF or DOCX (max 10MB)
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-300">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {success && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{success}</p>
                </div>
            )}
        </div>
    );
}
