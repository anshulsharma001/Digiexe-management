# Tool Management App - Cursor AI Prompt

## Project Overview

Build a modern, full-stack Tool Management Application with role-based access control, real-time push notifications, task management with timeline tracking, and team collaboration features.

---

## Tech Stack Requirements

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn/UI
- **Backend:** Next.js API Routes
- **Database:** Firebase Firestore
- **Authentication:** NextAuth.js with JWT + Firebase Auth
- **Push Notifications:** Web Push API with Service Workers
- **Real-time:** Firebase Realtime Database for live updates
- **Email:** Nodemailer or Resend for invitation emails
- **Cron Jobs:** Vercel Cron for deadline monitoring
- **File Storage:** Firebase Storage

---

## User Roles & Permissions

### 1. Super Admin
- Full system access
- Can create/manage organizations
- Can invite and manage Admins and Members
- Can assign/reassign tasks to anyone
- Can view all analytics and reports
- Can modify system settings
- Can delete any user or task

### 2. Admin
- Can invite and manage Members only
- Can assign tasks to Members
- Can view team analytics
- Can create and manage projects
- Cannot modify Super Admin settings
- Cannot delete other Admins

### 3. Member
- Can view assigned tasks
- Can update task status and progress
- Can add comments and attachments to tasks
- Can view own performance metrics
- Cannot invite users
- Cannot assign tasks to others

---

## Core Features

### 1. Authentication & Authorization System

```
- Email/password login via Firebase Auth
- NextAuth.js integration with Firebase credentials
- JWT-based session management
- Role-based route protection with middleware
- Password reset functionality via Firebase
- Remember me option
- Session timeout handling
- Activity logging for security audits
```

### 2. Invitation System

```
- Super Admin/Admin can generate invitation links
- Invitation link expiration (24-48 hours configurable)
- Email invitation with branded templates (Resend/Nodemailer)
- Bulk invitation support (CSV upload)
- Pending invitation management dashboard
- Resend invitation option
- Revoke invitation before acceptance
- Track invitation status (pending, accepted, expired)
```

### 3. Push Notification System

```
Implement browser push notifications for:

- New task assignment
- Task deadline approaching (configurable: 24h, 12h, 6h, 1h before)
- Task deadline exceeded/overdue
- Task status updates
- New comments on tasks
- Invitation received
- Role changes
- System announcements

Features:
- Service Worker registration for background notifications
- Web Push API with VAPID keys
- Notification preferences per user
- In-app notification center with read/unread status
- Notification history stored in Firestore
- Click-to-action (clicking notification opens relevant page)
- Badge count on browser tab
- Sound alerts (optional, user-configurable)
- Firebase Realtime listeners for instant in-app notifications
```

### 4. Task Management System

```
Task Properties:
- Title and description (rich text editor)
- Priority levels (Critical, High, Medium, Low)
- Status (To Do, In Progress, In Review, Blocked, Completed)
- Assignee(s) - single or multiple members
- Due date and time
- Start date
- Estimated hours
- Actual hours logged
- Tags/labels
- Attachments (files, images via Firebase Storage)
- Subtasks/checklist
- Comments thread
- Activity log

Task Features:
- Drag-and-drop Kanban board view
- List view with sorting and filtering
- Calendar view for timeline visualization
- Gantt chart for project timeline
- Task dependencies
- Recurring tasks
- Task templates
- Bulk task operations
- Task duplication
- Export tasks (CSV, PDF)
```

### 5. Timeline & Deadline Management

```
Timeline Features:
- Visual timeline/Gantt view
- Milestone tracking
- Progress percentage auto-calculation
- Time tracking per task
- Deadline color coding:
  * Green: On track (>24h remaining)
  * Yellow: Approaching (12-24h remaining)
  * Orange: Urgent (<12h remaining)
  * Red: Overdue

Automated Notifications:
- Configure notification intervals per task or globally
- Default reminders: 48h, 24h, 12h, 6h, 1h before deadline
- Escalation: Notify Admin if task overdue by X hours
- Daily digest email of upcoming deadlines
- Weekly summary report
```

### 6. Dashboard & Analytics

```
Super Admin Dashboard:
- Total users by role
- Active vs inactive users
- Task completion rates
- Overdue task metrics
- Team productivity graphs
- System health metrics

Admin Dashboard:
- Team member overview
- Task distribution chart
- Deadline compliance rate
- Team velocity metrics
- Individual performance comparison

Member Dashboard:
- My tasks overview (by status)
- Upcoming deadlines widget
- Recent activity feed
- Personal productivity stats
- Calendar with task deadlines
```

---

## Firebase Database Structure (Firestore)

```typescript
// Collections Structure

// users/{userId}
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    deadlineReminders: number[]; // hours before deadline [48, 24, 12, 6, 1]
  };
}

// invitations/{invitationId}
interface Invitation {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  token: string;
  expiresAt: Timestamp;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  invitedById: string;
  invitedByName: string;
  createdAt: Timestamp;
}

// tasks/{taskId}
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'COMPLETED';
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

// tasks/{taskId}/subtasks/{subtaskId}
interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: Timestamp;
}

// tasks/{taskId}/comments/{commentId}
interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// tasks/{taskId}/attachments/{attachmentId}
interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedById: string;
  createdAt: Timestamp;
}

// tags/{tagId}
interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Timestamp;
}

// notifications/{notificationId}
interface Notification {
  id: string;
  type:
    | 'TASK_ASSIGNED'
    | 'TASK_UPDATED'
    | 'TASK_COMPLETED'
    | 'DEADLINE_APPROACHING'
    | 'DEADLINE_OVERDUE'
    | 'COMMENT_ADDED'
    | 'INVITATION_RECEIVED'
    | 'ROLE_CHANGED'
    | 'SYSTEM_ANNOUNCEMENT';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  userId: string;
  taskId?: string;
  createdAt: Timestamp;
}

// pushSubscriptions/{subscriptionId}
interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Timestamp;
}

// activityLogs/{logId}
interface ActivityLog {
  id: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  userId: string;
  userName: string;
  taskId?: string;
  createdAt: Timestamp;
}
```

---

## Firebase Realtime Database Structure

```typescript
// For real-time presence and live updates

// /presence/{userId}
interface UserPresence {
  online: boolean;
  lastSeen: number; // timestamp
}

// /taskUpdates/{taskId}
interface TaskUpdate {
  lastUpdated: number;
  updatedBy: string;
  updateType: 'status' | 'comment' | 'assignment' | 'progress';
}

// /notifications/{userId}/{notificationId}
interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  taskId?: string;
  timestamp: number;
}
```

---

## API Endpoints Structure

```
Authentication:
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me

Users:
GET    /api/users                    (Admin+)
GET    /api/users/:id                (Admin+)
PATCH  /api/users/:id                (Admin+)
DELETE /api/users/:id                (Super Admin)
PATCH  /api/users/:id/role           (Super Admin)

Invitations:
POST   /api/invitations              (Admin+)
GET    /api/invitations              (Admin+)
POST   /api/invitations/bulk         (Admin+)
DELETE /api/invitations/:id          (Admin+)
POST   /api/invitations/:token/accept
GET    /api/invitations/:token/verify

Tasks:
GET    /api/tasks                    (All - filtered by role)
POST   /api/tasks                    (Admin+)
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id                (Admin+)
POST   /api/tasks/:id/comments
PATCH  /api/tasks/:id/status
POST   /api/tasks/:id/attachments

Notifications:
GET    /api/notifications
PATCH  /api/notifications/:id/read
POST   /api/notifications/read-all
DELETE /api/notifications/:id
POST   /api/push/subscribe
DELETE /api/push/unsubscribe

Dashboard:
GET    /api/dashboard/stats
GET    /api/dashboard/timeline
GET    /api/dashboard/analytics

Cron (Vercel):
GET    /api/cron/check-deadlines     (Protected with CRON_SECRET)
```

---

## UI/UX Requirements

### Design System
- Clean, modern interface with consistent spacing
- Dark/Light mode toggle
- Responsive design (mobile, tablet, desktop)
- Accessible (WCAG 2.1 AA compliant)
- Smooth animations and transitions
- Loading states and skeletons
- Error states with helpful messages

### Key Pages

```
/                       - Landing/Login page
/dashboard              - Role-specific dashboard
/tasks                  - Task list/Kanban board
/tasks/[id]             - Task detail page
/tasks/create           - Create new task (Admin+)
/calendar               - Calendar view of tasks
/timeline               - Gantt chart view
/team                   - Team members list (Admin+)
/team/invite            - Invite new members (Admin+)
/notifications          - Notification center
/settings               - User settings
/settings/notifications - Notification preferences
/admin                  - Admin panel (Admin+)
/admin/users            - User management (Super Admin)
```

### Component Library Needs
- Data tables with sorting, filtering, pagination
- Kanban board with drag-and-drop
- Calendar component
- Gantt chart component
- Rich text editor
- File upload with preview
- Modal dialogs
- Toast notifications
- Dropdown menus
- Date/time pickers
- Progress bars
- Avatar with status indicator
- Badge components
- Skeleton loaders

---

## Implementation Details

### Firebase Configuration

```typescript
// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);
export default app;
```

### Firebase Admin (Server-side)

```typescript
// lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
);

const app = getApps().length === 0
  ? initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    })
  : getApps()[0];

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
```

### Web Push Service Worker

```javascript
// public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.actionUrl || '/'
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.tag || 'default', // Prevents duplicate notifications
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
    );
  }
});
```

### Push Notification Hook

```typescript
// hooks/usePushNotifications.ts
import { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function usePushNotifications(userId: string | undefined) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  const subscribe = async () => {
    if (!isSupported || !userId) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      // Save subscription to Firestore
      await setDoc(doc(db, 'pushSubscriptions', `${userId}_${Date.now()}`), {
        userId,
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
        },
        createdAt: new Date(),
      });

      setSubscription(sub);
      setIsSubscribed(true);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;

    await subscription.unsubscribe();
    setSubscription(null);
    setIsSubscribed(false);
  };

  return { isSupported, isSubscribed, subscribe, unsubscribe };
}
```

### Firebase Realtime Listener Hook

```typescript
// hooks/useRealtimeNotifications.ts
import { useEffect } from 'react';
import { ref, onChildAdded, off } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import { toast } from 'sonner';

export function useRealtimeNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const notificationsRef = ref(realtimeDb, `notifications/${userId}`);

    const unsubscribe = onChildAdded(notificationsRef, (snapshot) => {
      const notification = snapshot.val();

      // Show toast notification
      toast(notification.title, {
        description: notification.message,
        action: notification.taskId ? {
          label: 'View',
          onClick: () => window.location.href = `/tasks/${notification.taskId}`
        } : undefined
      });
    });

    return () => {
      off(notificationsRef);
    };
  }, [userId]);
}
```

### Deadline Monitoring (Vercel Cron)

```typescript
// app/api/cron/check-deadlines/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import webpush from 'web-push';

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    // Get tasks with upcoming deadlines
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('status', 'not-in', ['COMPLETED'])
      .where('dueDate', '>=', Timestamp.fromDate(now))
      .where('dueDate', '<=', Timestamp.fromDate(in24Hours))
      .get();

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      const dueDate = task.dueDate.toDate();
      const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      let message = '';
      if (hoursRemaining <= 1) {
        message = 'URGENT: Task due in 1 hour!';
      } else if (hoursRemaining <= 6) {
        message = 'Task due in 6 hours';
      } else if (hoursRemaining <= 12) {
        message = 'Task due in 12 hours';
      } else if (hoursRemaining <= 24) {
        message = 'Task due tomorrow';
      }

      if (message && task.assigneeId) {
        await sendPushNotification(task.assigneeId, {
          title: message,
          message: task.title,
          actionUrl: `/tasks/${taskDoc.id}`,
          tag: `deadline-${taskDoc.id}`
        });

        // Store notification in Firestore
        await adminDb.collection('notifications').add({
          type: 'DEADLINE_APPROACHING',
          title: message,
          message: task.title,
          userId: task.assigneeId,
          taskId: taskDoc.id,
          isRead: false,
          actionUrl: `/tasks/${taskDoc.id}`,
          createdAt: Timestamp.now(),
        });
      }
    }

    // Check overdue tasks
    const overdueSnapshot = await adminDb
      .collection('tasks')
      .where('status', 'not-in', ['COMPLETED'])
      .where('dueDate', '<', Timestamp.fromDate(now))
      .get();

    for (const taskDoc of overdueSnapshot.docs) {
      const task = taskDoc.data();

      // Notify assignee
      if (task.assigneeId) {
        await sendPushNotification(task.assigneeId, {
          title: 'OVERDUE: Task past deadline!',
          message: task.title,
          actionUrl: `/tasks/${taskDoc.id}`,
          tag: `overdue-${taskDoc.id}`
        });
      }

      // Escalate to creator/admin
      if (task.creatorId && task.creatorId !== task.assigneeId) {
        await sendPushNotification(task.creatorId, {
          title: `Escalation: Task overdue`,
          message: `"${task.title}" is past its deadline`,
          actionUrl: `/tasks/${taskDoc.id}`,
          tag: `escalation-${taskDoc.id}`
        });
      }
    }

    return NextResponse.json({ success: true, checked: tasksSnapshot.size + overdueSnapshot.size });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function sendPushNotification(userId: string, payload: any) {
  const subscriptionsSnapshot = await adminDb
    .collection('pushSubscriptions')
    .where('userId', '==', userId)
    .get();

  for (const subDoc of subscriptionsSnapshot.docs) {
    const sub = subDoc.data();
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys
        },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      // Remove invalid subscription
      if (error.statusCode === 410) {
        await subDoc.ref.delete();
      }
    }
  }
}
```

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-deadlines",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isSuperAdmin() {
      return isAuthenticated() && getUserRole() == 'SUPER_ADMIN';
    }

    function isAdmin() {
      return isAuthenticated() && (getUserRole() == 'ADMIN' || getUserRole() == 'SUPER_ADMIN');
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isSuperAdmin() || isAdmin();
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isSuperAdmin();
    }

    // Tasks collection
    match /tasks/{taskId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAuthenticated();
      allow delete: if isAdmin();

      // Subcollections
      match /subtasks/{subtaskId} {
        allow read, write: if isAuthenticated();
      }
      match /comments/{commentId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated();
        allow update, delete: if isOwner(resource.data.userId);
      }
      match /attachments/{attachmentId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated();
        allow delete: if isAdmin() || isOwner(resource.data.uploadedById);
      }
    }

    // Invitations collection
    match /invitations/{invitationId} {
      allow read: if isAdmin() || resource.data.email == request.auth.token.email;
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId);
    }

    // Push subscriptions
    match /pushSubscriptions/{subscriptionId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated();
      allow delete: if isOwner(resource.data.userId);
    }

    // Activity logs
    match /activityLogs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
    }

    // Tags
    match /tags/{tagId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

---

## Firebase Realtime Database Rules

```json
// database.rules.json
{
  "rules": {
    "presence": {
      "$userId": {
        ".read": true,
        ".write": "$userId === auth.uid"
      }
    },
    "taskUpdates": {
      "$taskId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "notifications": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## Security Considerations

1. **Authentication Security**
   - Firebase Auth handles password security
   - JWT with NextAuth.js for session management
   - Rate limiting on API endpoints
   - Account lockout after failed attempts (Firebase handles this)

2. **Authorization**
   - Firestore security rules for database-level protection
   - Middleware for role-based access control in Next.js
   - Resource-level permission checks in API routes

3. **Data Security**
   - Input validation and sanitization
   - Firestore security rules prevent unauthorized access
   - XSS protection via React's built-in escaping
   - CSRF tokens via NextAuth.js
   - Secure headers (Next.js built-in)

4. **File Upload Security**
   - File type validation
   - File size limits (Firebase Storage rules)
   - Secure URLs with Firebase Storage download tokens

---

## Environment Variables

```env
# Firebase (Client-side)
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_DATABASE_URL="https://your-project.firebaseio.com"

# Firebase Admin (Server-side)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:admin@yourdomain.com"

# Email (Resend or Nodemailer)
RESEND_API_KEY="your-resend-api-key"
# OR for Nodemailer:
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email"
SMTP_PASSWORD="your-password"
EMAIL_FROM="noreply@yourdomain.com"

# Vercel Cron
CRON_SECRET="your-cron-secret"

# App
APP_URL="http://localhost:3000"
APP_NAME="Tool Management"
```

---

## Getting Started Instructions

1. Initialize Next.js project with TypeScript
   ```bash
   npx create-next-app@latest tool-management --typescript --tailwind --app
   ```

2. Install dependencies
   ```bash
   npm install firebase firebase-admin next-auth @auth/firebase-adapter
   npm install web-push uuid date-fns
   npm install @tanstack/react-query zustand
   npm install -D @types/web-push
   npx shadcn-ui@latest init
   ```

3. Set up Firebase project in Firebase Console
   - Enable Authentication (Email/Password)
   - Create Firestore Database
   - Create Realtime Database
   - Set up Firebase Storage
   - Generate service account key

4. Configure environment variables

5. Set up Firebase security rules

6. Implement authentication with NextAuth.js + Firebase

7. Create role-based middleware

8. Build user management and invitation system

9. Implement task CRUD operations with Firestore

10. Set up Web Push notification service worker

11. Create Vercel Cron job for deadline monitoring

12. Build dashboard with analytics

13. Add real-time updates with Firebase Realtime Database

14. Implement file upload with Firebase Storage

15. Deploy to Vercel

---

## Additional Features to Consider

- **Integrations:** Slack, Discord, Microsoft Teams webhooks
- **Import/Export:** CSV, Excel task import/export
- **Reports:** Generate PDF reports
- **Audit Trail:** Complete activity logging
- **Backup:** Firebase automatic backups
- **Multi-language:** i18n support
- **Custom Fields:** Allow custom task fields
- **Templates:** Project and task templates
- **Time Zones:** User timezone support
- **Offline Support:** Firebase offline persistence
- **Mobile App:** React Native with Firebase

---

## Prompt Summary for Cursor

Copy this condensed version for quick use:

```
Build a Tool Management App with:

TECH: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Firebase (Firestore, Realtime DB, Storage, Auth), NextAuth.js, Web Push API, Vercel Cron

ROLES:
- Super Admin: Full access, manage all users, system settings
- Admin: Invite members, assign tasks, view team analytics
- Member: View/update assigned tasks, add comments

FEATURES:
1. Auth: Firebase Auth + NextAuth.js, JWT sessions, role-based protection, password reset
2. Invitations: Email invites with expiration (Resend/Nodemailer), bulk invite, status tracking
3. Push Notifications: Web Push API with Service Worker, deadline alerts (24h, 12h, 6h, 1h before), overdue escalation, in-app notification center with Firebase Realtime listeners
4. Tasks: Kanban board, list view, calendar, Gantt chart, subtasks, comments, attachments (Firebase Storage), priority levels, status tracking
5. Timeline: Visual timeline, color-coded deadlines (green/yellow/orange/red), Vercel Cron for automated notifications, daily digest emails
6. Dashboard: Role-specific analytics, task metrics, productivity graphs
7. Real-time: Firebase Realtime Database for live task updates, presence indicators

Include: Dark mode, responsive design, Firestore security rules, file uploads to Firebase Storage, activity logging
```

---

*Use this prompt with Cursor AI to generate a complete, production-ready tool management application with Firebase.*
