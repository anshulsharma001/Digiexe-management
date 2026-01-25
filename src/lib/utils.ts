import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Timestamp } from "firebase/firestore";
import { format, formatDistanceToNow, isAfter, isBefore, addHours } from "date-fns";
import { Priority, TaskStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert Firestore Timestamp to Date
export function timestampToDate(timestamp: Timestamp | undefined): Date | null {
  if (!timestamp) return null;
  return timestamp.toDate();
}

// Format date for display
export function formatDate(date: Date | Timestamp | undefined): string {
  if (!date) return "No date";
  const d = date instanceof Timestamp ? date.toDate() : date;
  return format(d, "MMM d, yyyy");
}

// Format date with time
export function formatDateTime(date: Date | Timestamp | undefined): string {
  if (!date) return "No date";
  const d = date instanceof Timestamp ? date.toDate() : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

// Format relative time
export function formatRelativeTime(date: Date | Timestamp | undefined): string {
  if (!date) return "";
  const d = date instanceof Timestamp ? date.toDate() : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

// Get deadline status color
export function getDeadlineColor(dueDate: Date | Timestamp | undefined): string {
  if (!dueDate) return "text-muted-foreground";

  const d = dueDate instanceof Timestamp ? dueDate.toDate() : dueDate;
  const now = new Date();

  if (isBefore(d, now)) {
    return "text-red-500"; // Overdue
  }

  const in12Hours = addHours(now, 12);
  const in24Hours = addHours(now, 24);

  if (isBefore(d, in12Hours)) {
    return "text-orange-500"; // Urgent (<12h)
  }

  if (isBefore(d, in24Hours)) {
    return "text-yellow-500"; // Approaching (12-24h)
  }

  return "text-green-500"; // On track (>24h)
}

// Get deadline status badge
export function getDeadlineStatus(dueDate: Date | Timestamp | undefined): {
  label: string;
  variant: "default" | "destructive" | "warning" | "success";
} {
  if (!dueDate) return { label: "No deadline", variant: "default" };

  const d = dueDate instanceof Timestamp ? dueDate.toDate() : dueDate;
  const now = new Date();

  if (isBefore(d, now)) {
    return { label: "Overdue", variant: "destructive" };
  }

  const in12Hours = addHours(now, 12);
  const in24Hours = addHours(now, 24);

  if (isBefore(d, in12Hours)) {
    return { label: "Urgent", variant: "destructive" };
  }

  if (isBefore(d, in24Hours)) {
    return { label: "Due soon", variant: "warning" };
  }

  return { label: "On track", variant: "success" };
}

// Get priority color
export function getPriorityColor(priority: Priority): string {
  const colors: Record<Priority, string> = {
    CRITICAL: "text-red-500 bg-red-500/10",
    HIGH: "text-orange-500 bg-orange-500/10",
    MEDIUM: "text-yellow-500 bg-yellow-500/10",
    LOW: "text-green-500 bg-green-500/10",
  };
  return colors[priority];
}

// Get priority label
export function getPriorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    CRITICAL: "Critical",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  };
  return labels[priority];
}

// Get status color
export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    TODO: "text-slate-500 bg-slate-500/10",
    IN_PROGRESS: "text-blue-500 bg-blue-500/10",
    IN_REVIEW: "text-purple-500 bg-purple-500/10",
    BLOCKED: "text-red-500 bg-red-500/10",
    COMPLETED: "text-green-500 bg-green-500/10",
  };
  return colors[status];
}

// Get status label
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    BLOCKED: "Blocked",
    COMPLETED: "Completed",
  };
  return labels[status];
}

// Generate random color for tags
export function generateTagColor(): string {
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generate random string for tokens
export function generateToken(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Check if user has permission
export function hasPermission(
  userRole: string,
  requiredRoles: string[]
): boolean {
  return requiredRoles.includes(userRole);
}

// Check if user is admin or super admin
export function isAdminOrHigher(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// Check if user is super admin
export function isSuperAdmin(role: string): boolean {
  return role === "SUPER_ADMIN";
}
