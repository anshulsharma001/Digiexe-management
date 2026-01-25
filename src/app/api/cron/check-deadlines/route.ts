import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import webpush from "web-push";

// Configure web-push
if (process.env.VAPID_SUBJECT && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = {
    checked: 0,
    approaching: 0,
    overdue: 0,
    notificationsSent: 0,
    errors: [] as string[],
  };

  try {
    // Get tasks with upcoming deadlines (next 24 hours)
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingTasksSnapshot = await adminDb
      .collection("tasks")
      .where("status", "not-in", ["COMPLETED"])
      .where("dueDate", ">=", Timestamp.fromDate(now))
      .where("dueDate", "<=", Timestamp.fromDate(in24Hours))
      .get();

    results.checked += upcomingTasksSnapshot.size;

    for (const taskDoc of upcomingTasksSnapshot.docs) {
      const task = taskDoc.data();
      const dueDate = task.dueDate.toDate();
      const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      let message = "";
      let tag = "";

      if (hoursRemaining <= 1) {
        message = "URGENT: Task due in 1 hour!";
        tag = `urgent-${taskDoc.id}`;
      } else if (hoursRemaining <= 6) {
        message = "Task due in 6 hours";
        tag = `deadline-6h-${taskDoc.id}`;
      } else if (hoursRemaining <= 12) {
        message = "Task due in 12 hours";
        tag = `deadline-12h-${taskDoc.id}`;
      } else if (hoursRemaining <= 24) {
        message = "Task due tomorrow";
        tag = `deadline-24h-${taskDoc.id}`;
      }

      if (message && task.assigneeId) {
        results.approaching++;

        // Check if notification was already sent (using tag as identifier)
        const existingNotification = await adminDb
          .collection("notifications")
          .where("taskId", "==", taskDoc.id)
          .where("type", "==", "DEADLINE_APPROACHING")
          .where("title", "==", message)
          .limit(1)
          .get();

        if (existingNotification.empty) {
          try {
            await sendPushNotification(task.assigneeId, {
              title: message,
              message: task.title,
              actionUrl: `/tasks/${taskDoc.id}`,
              tag,
            });

            // Store notification in Firestore
            await adminDb.collection("notifications").add({
              type: "DEADLINE_APPROACHING",
              title: message,
              message: task.title,
              userId: task.assigneeId,
              taskId: taskDoc.id,
              isRead: false,
              actionUrl: `/tasks/${taskDoc.id}`,
              createdAt: Timestamp.now(),
            });

            results.notificationsSent++;
          } catch (error: any) {
            results.errors.push(`Failed to send notification for task ${taskDoc.id}: ${error.message}`);
          }
        }
      }
    }

    // Check overdue tasks
    const overdueTasksSnapshot = await adminDb
      .collection("tasks")
      .where("status", "not-in", ["COMPLETED"])
      .where("dueDate", "<", Timestamp.fromDate(now))
      .get();

    results.checked += overdueTasksSnapshot.size;

    for (const taskDoc of overdueTasksSnapshot.docs) {
      const task = taskDoc.data();
      results.overdue++;

      // Check if overdue notification was already sent today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingOverdueNotification = await adminDb
        .collection("notifications")
        .where("taskId", "==", taskDoc.id)
        .where("type", "==", "DEADLINE_OVERDUE")
        .where("createdAt", ">=", Timestamp.fromDate(today))
        .limit(1)
        .get();

      if (existingOverdueNotification.empty && task.assigneeId) {
        try {
          // Notify assignee
          await sendPushNotification(task.assigneeId, {
            title: "OVERDUE: Task past deadline!",
            message: task.title,
            actionUrl: `/tasks/${taskDoc.id}`,
            tag: `overdue-${taskDoc.id}`,
          });

          await adminDb.collection("notifications").add({
            type: "DEADLINE_OVERDUE",
            title: "OVERDUE: Task past deadline!",
            message: task.title,
            userId: task.assigneeId,
            taskId: taskDoc.id,
            isRead: false,
            actionUrl: `/tasks/${taskDoc.id}`,
            createdAt: Timestamp.now(),
          });

          results.notificationsSent++;

          // Escalate to creator if different from assignee
          if (task.creatorId && task.creatorId !== task.assigneeId) {
            await sendPushNotification(task.creatorId, {
              title: "Escalation: Task overdue",
              message: `"${task.title}" is past its deadline`,
              actionUrl: `/tasks/${taskDoc.id}`,
              tag: `escalation-${taskDoc.id}`,
            });

            await adminDb.collection("notifications").add({
              type: "DEADLINE_OVERDUE",
              title: "Escalation: Task overdue",
              message: `"${task.title}" is past its deadline`,
              userId: task.creatorId,
              taskId: taskDoc.id,
              isRead: false,
              actionUrl: `/tasks/${taskDoc.id}`,
              createdAt: Timestamp.now(),
            });

            results.notificationsSent++;
          }
        } catch (error: any) {
          results.errors.push(`Failed to send overdue notification for task ${taskDoc.id}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        results,
      },
      { status: 500 }
    );
  }
}

async function sendPushNotification(userId: string, payload: any) {
  if (!process.env.VAPID_PRIVATE_KEY) {
    console.log("VAPID keys not configured, skipping push notification");
    return;
  }

  const subscriptionsSnapshot = await adminDb
    .collection("pushSubscriptions")
    .where("userId", "==", userId)
    .get();

  const sendPromises = subscriptionsSnapshot.docs.map(async (subDoc) => {
    const sub = subDoc.data();
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      // Remove invalid subscription (gone or expired)
      if (error.statusCode === 410 || error.statusCode === 404) {
        await subDoc.ref.delete();
      }
      throw error;
    }
  });

  await Promise.allSettled(sendPromises);
}
