import { Timestamp } from "firebase/firestore";

// User Roles
export type Role = "SUPER_ADMIN" | "ADMIN" | "MEMBER";

// Task Priority
export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// Task Status
export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "BLOCKED"
  | "COMPLETED";

// Invitation Status
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

// Notification Type
export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "TASK_COMPLETED"
  | "DEADLINE_APPROACHING"
  | "DEADLINE_OVERDUE"
  | "COMMENT_ADDED"
  | "INVITATION_RECEIVED"
  | "ROLE_CHANGED"
  | "SYSTEM_ANNOUNCEMENT";

// User Interface
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: Role;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  notificationPreferences: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  deadlineReminders: number[]; // hours before deadline [48, 24, 12, 6, 1]
}

// Invitation Interface
export interface Invitation {
  id: string;
  email: string;
  role: Exclude<Role, "SUPER_ADMIN">;
  token: string;
  expiresAt: Timestamp;
  status: InvitationStatus;
  invitedById: string;
  invitedByName: string;
  createdAt: Timestamp;
}

// Task Interface
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: Timestamp;
  startDate?: Timestamp;
  estimatedHours?: number;
  actualHours?: number;
  progress: number; // 0-100
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorId: string;
  creatorName: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

// Subtask Interface
export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: Timestamp;
}

// Comment Interface
export interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Attachment Interface
export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedById: string;
  createdAt: Timestamp;
}

// Tag Interface
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Timestamp;
}

// Notification Interface
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  userId: string;
  taskId?: string;
  createdAt: Timestamp;
}

// Push Subscription Interface
export interface PushSubscriptionData {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Timestamp;
}

// Activity Log Interface
export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  userId: string;
  userName: string;
  taskId?: string;
  createdAt: Timestamp;
}

// Dashboard Stats Interface
export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalUsers: number;
  activeUsers: number;
}

// Task with Details (including subtasks, comments, attachments)
export interface TaskWithDetails extends Task {
  subtasks: Subtask[];
  comments: Comment[];
  attachments: Attachment[];
}

// Session User (for NextAuth)
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: Role;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Kanban Column
export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
}

// Date filter options
export type DateFilter = "today" | "week" | "month" | "all";

// Sort options
export type SortOption = "dueDate" | "priority" | "createdAt" | "title";
export type SortOrder = "asc" | "desc";
