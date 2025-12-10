import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableTitleProps {
    initialValue: string;
    onSave: (newValue: string) => Promise<void>;
    className?: string;
    isHeader?: boolean;
    placeholder?: string;
    editOnIconOnly?: boolean;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({
    initialValue,
    onSave,
    className,
    isHeader = false,
    placeholder = "Untitled Project",
    editOnIconOnly = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update local value if prop changes (external update)
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (value.trim() === '' || value === initialValue) {
            setIsEditing(false);
            setValue(initialValue);
            return;
        }

        setSaving(true);
        try {
            await onSave(value);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save title", error);
            // Revert on error
            setValue(initialValue);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setValue(initialValue);
        }
    };

    if (isEditing) {
        return (
            <div className={cn("flex items-center gap-2", className)} onClick={(e) => {
                // Stop propagation if click happens inside input container (prevents link nav)
                e.stopPropagation();
                e.preventDefault();
            }}>
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className={cn(
                        "bg-white dark:bg-slate-800 border-2 border-purple-500 rounded px-2 py-1 outline-none text-gray-900 dark:text-gray-100 w-full transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500",
                        // Fix for browser autofill white background
                        "[&:-webkit-autofill]:bg-white dark:[&:-webkit-autofill]:bg-slate-800 [&:-webkit-autofill]:text-gray-900 dark:[&:-webkit-autofill]:text-gray-100",
                        isHeader ? "text-2xl sm:text-3xl font-extrabold" : "text-sm font-medium"
                    )}
                    placeholder={placeholder}
                    disabled={saving}
                />
                <div className="flex items-center gap-1">
                    <button
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur from triggering first
                        onClick={handleSave}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 rounded transition-colors"
                        disabled={saving}
                    >
                        <Check className="h-4 w-4" />
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            setIsEditing(false);
                            setValue(initialValue);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded transition-colors"
                        disabled={saving}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "group flex items-center gap-2 relative", // relative for positioning if needed
                !editOnIconOnly && "cursor-pointer", // only show pointer if clicking text works
                className
            )}
            onClick={(e) => {
                if (!editOnIconOnly) {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditing(true);
                }
            }}
            title={editOnIconOnly ? undefined : "Click to rename"}
        >
            <span className={cn(
                "break-words leading-tight truncate",
                isHeader ? "text-2xl sm:text-3xl font-extrabold" : "flex-1"
            )}>
                {value}
            </span>
            <button
                type="button"
                className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700",
                    isHeader ? "ml-2" : ""
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsEditing(true);
                }}
                title="Rename"
            >
                <Pencil className={cn(
                    "text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors",
                    isHeader ? "h-5 w-5" : "h-3.5 w-3.5"
                )} />
            </button>
        </div>
    );
};
