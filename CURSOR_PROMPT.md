# Tool Management App - Cursor AI Prompt

## Project Overview

Build a modern, full-stack Tool Management Application with role-based access control, real-time push notifications, task management with timeline tracking, and team collaboration features.

---

## Tech Stack Requirements

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn/UI
- **Backend:** Next.js API Routes or Node.js/Express
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with JWT
- **Push Notifications:** Firebase Cloud Messaging (FCM) or Web Push API
- **Real-time:** Socket.io or Pusher for live updates
- **Email:** Nodemailer or Resend for invitation emails
- **Cron Jobs:** node-cron or Vercel Cron for deadline monitoring

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
- Email/password login with secure hashing (bcrypt)
- JWT-based session management
- Role-based route protection
- Password reset functionality
- Remember me option
- Session timeout handling
- Activity logging for security audits
```

### 2. Invitation System

```
- Super Admin/Admin can generate invitation links
- Invitation link expiration (24-48 hours configurable)
- Email invitation with branded templates
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
- Notification preferences per user
- In-app notification center with read/unread status
- Notification history
- Click-to-action (clicking notification opens relevant page)
- Badge count on browser tab
- Sound alerts (optional, user-configurable)
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
- Attachments (files, images)
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

## Database Schema (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  avatar        String?
  role          Role      @default(MEMBER)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  // Relations
  assignedTasks Task[]    @relation("AssignedTasks")
  createdTasks  Task[]    @relation("CreatedTasks")
  comments      Comment[]
  notifications Notification[]
  invitationsSent Invitation[] @relation("InvitedBy")
  pushSubscriptions PushSubscription[]
  activityLogs  ActivityLog[]
}

enum Role {
  SUPER_ADMIN
  ADMIN
  MEMBER
}

model Invitation {
  id          String    @id @default(cuid())
  email       String
  role        Role
  token       String    @unique
  expiresAt   DateTime
  status      InvitationStatus @default(PENDING)
  invitedById String
  invitedBy   User      @relation("InvitedBy", fields: [invitedById], references: [id])
  createdAt   DateTime  @default(now())
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

model Task {
  id            String    @id @default(cuid())
  title         String
  description   String?   @db.Text
  priority      Priority  @default(MEDIUM)
  status        TaskStatus @default(TODO)
  dueDate       DateTime?
  startDate     DateTime?
  estimatedHours Float?
  actualHours   Float?
  progress      Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  assigneeId    String?
  assignee      User?     @relation("AssignedTasks", fields: [assigneeId], references: [id])
  creatorId     String
  creator       User      @relation("CreatedTasks", fields: [creatorId], references: [id])
  comments      Comment[]
  attachments   Attachment[]
  subtasks      Subtask[]
  tags          Tag[]
  notifications Notification[]
  activityLogs  ActivityLog[]
}

enum Priority {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  BLOCKED
  COMPLETED
}

model Subtask {
  id          String   @id @default(cuid())
  title       String
  isCompleted Boolean  @default(false)
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model Comment {
  id        String   @id @default(cuid())
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId    String
  user      User     @relation(fields: [userId], references: [id])
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model Attachment {
  id        String   @id @default(cuid())
  fileName  String
  fileUrl   String
  fileType  String
  fileSize  Int
  createdAt DateTime @default(now())

  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  color String @default("#6366f1")
  tasks Task[]
}

model Notification {
  id        String   @id @default(cuid())
  type      NotificationType
  title     String
  message   String
  isRead    Boolean  @default(false)
  actionUrl String?
  createdAt DateTime @default(now())

  userId    String
  user      User     @relation(fields: [userId], references: [id])
  taskId    String?
  task      Task?    @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_UPDATED
  TASK_COMPLETED
  DEADLINE_APPROACHING
  DEADLINE_OVERDUE
  COMMENT_ADDED
  INVITATION_RECEIVED
  ROLE_CHANGED
  SYSTEM_ANNOUNCEMENT
}

model PushSubscription {
  id        String   @id @default(cuid())
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  userId    String
  user      User     @relation(fields: [userId], references: [id])
}

model ActivityLog {
  id          String   @id @default(cuid())
  action      String
  description String
  metadata    Json?
  createdAt   DateTime @default(now())

  userId      String
  user        User     @relation(fields: [userId], references: [id])
  taskId      String?
  task        Task?    @relation(fields: [taskId], references: [id], onDelete: Cascade)
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

## Notification Implementation Details

### Service Worker Setup

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
      url: data.actionUrl
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
```

### Deadline Monitoring Cron Job

```javascript
// Run every hour to check deadlines
cron.schedule('0 * * * *', async () => {
  const upcomingTasks = await prisma.task.findMany({
    where: {
      status: { not: 'COMPLETED' },
      dueDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
      }
    },
    include: { assignee: true }
  });

  for (const task of upcomingTasks) {
    const hoursRemaining = (task.dueDate - new Date()) / (1000 * 60 * 60);

    if (hoursRemaining <= 1) {
      await sendNotification(task.assignee, 'URGENT: Task due in 1 hour', task);
    } else if (hoursRemaining <= 6) {
      await sendNotification(task.assignee, 'Task due in 6 hours', task);
    } else if (hoursRemaining <= 24) {
      await sendNotification(task.assignee, 'Task due tomorrow', task);
    }
  }

  // Check overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { not: 'COMPLETED' },
      dueDate: { lt: new Date() }
    },
    include: { assignee: true, creator: true }
  });

  for (const task of overdueTasks) {
    await sendNotification(task.assignee, 'OVERDUE: Task past deadline', task);
    // Escalate to admin/creator
    await sendNotification(task.creator, `Escalation: Task "${task.title}" is overdue`, task);
  }
});
```

---

## Security Considerations

1. **Authentication Security**
   - Password hashing with bcrypt (12+ rounds)
   - JWT with short expiration (15-30 min) + refresh tokens
   - Rate limiting on auth endpoints
   - Account lockout after failed attempts

2. **Authorization**
   - Middleware for role-based access control
   - Resource-level permission checks
   - API route protection

3. **Data Security**
   - Input validation and sanitization
   - SQL injection prevention (Prisma handles this)
   - XSS protection
   - CSRF tokens
   - Secure headers (Helmet.js)

4. **File Upload Security**
   - File type validation
   - File size limits
   - Virus scanning (optional)
   - Secure storage (S3 with signed URLs)

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/toolmanagement"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="your-jwt-secret"

# Push Notifications
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:admin@yourdomain.com"

# Email
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email"
SMTP_PASSWORD="your-password"
EMAIL_FROM="noreply@yourdomain.com"

# File Storage (S3)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-bucket"

# App
APP_URL="http://localhost:3000"
APP_NAME="Tool Management"
```

---

## Getting Started Instructions

1. Initialize Next.js project with TypeScript
2. Set up Prisma with PostgreSQL
3. Implement authentication with NextAuth.js
4. Create role-based middleware
5. Build user management and invitation system
6. Implement task CRUD operations
7. Set up push notification service worker
8. Create deadline monitoring cron jobs
9. Build dashboard with analytics
10. Add real-time updates with Socket.io
11. Implement file upload system
12. Create comprehensive test suite
13. Deploy to Vercel/AWS

---

## Additional Features to Consider

- **Integrations:** Slack, Discord, Microsoft Teams webhooks
- **Import/Export:** CSV, Excel task import/export
- **Reports:** Generate PDF reports
- **Audit Trail:** Complete activity logging
- **Backup:** Automated database backups
- **Multi-language:** i18n support
- **Custom Fields:** Allow custom task fields
- **Templates:** Project and task templates
- **Time Zones:** User timezone support
- **API Keys:** For external integrations
- **Webhooks:** Outgoing webhooks for events
- **Mobile App:** React Native companion app

---

## Prompt Summary for Cursor

Copy this condensed version for quick use:

```
Build a Tool Management App with:

TECH: Next.js 14+, TypeScript, Tailwind, Shadcn/UI, PostgreSQL, Prisma, NextAuth.js, Firebase Cloud Messaging

ROLES:
- Super Admin: Full access, manage all users, system settings
- Admin: Invite members, assign tasks, view team analytics
- Member: View/update assigned tasks, add comments

FEATURES:
1. Auth: JWT sessions, role-based protection, password reset
2. Invitations: Email invites with expiration, bulk invite, status tracking
3. Push Notifications: Service worker, deadline alerts (24h, 12h, 6h, 1h before), overdue escalation, in-app notification center
4. Tasks: Kanban board, list view, calendar, Gantt chart, subtasks, comments, attachments, priority levels, status tracking
5. Timeline: Visual timeline, color-coded deadlines (green/yellow/orange/red), automated notifications, daily digest emails
6. Dashboard: Role-specific analytics, task metrics, productivity graphs

Include: Dark mode, responsive design, real-time updates, file uploads, activity logging
```

---

*Use this prompt with Cursor AI to generate a complete, production-ready tool management application.*
