"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, DashboardStats } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  formatDate,
  formatRelativeTime,
  getDeadlineColor,
  getPriorityColor,
  getPriorityLabel,
  getStatusLabel,
  isAdminOrHigher,
} from "@/lib/utils";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    totalUsers: 0,
    activeUsers: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userRole = session?.user?.role || "MEMBER";
  const userId = session?.user?.id;
  const isAdmin = isAdminOrHigher(userRole);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userId) return;

      try {
        // Fetch tasks based on role
        let tasksQuery;
        if (isAdmin) {
          tasksQuery = query(collection(db, "tasks"));
        } else {
          tasksQuery = query(
            collection(db, "tasks"),
            where("assigneeId", "==", userId)
          );
        }

        const tasksSnapshot = await getDocs(tasksQuery);
        const tasks = tasksSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];

        // Calculate stats
        const now = new Date();
        const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
        const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
        const overdueTasks = tasks.filter((t) => {
          if (!t.dueDate || t.status === "COMPLETED") return false;
          const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : t.dueDate;
          return dueDate < now;
        }).length;

        // Get recent tasks
        const sortedTasks = [...tasks].sort((a, b) => {
          const dateA = a.updatedAt instanceof Timestamp ? a.updatedAt.toDate() : new Date(0);
          const dateB = b.updatedAt instanceof Timestamp ? b.updatedAt.toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        // Get upcoming deadlines (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcoming = tasks
          .filter((t) => {
            if (!t.dueDate || t.status === "COMPLETED") return false;
            const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : t.dueDate;
            return dueDate >= now && dueDate <= nextWeek;
          })
          .sort((a, b) => {
            const dateA = a.dueDate instanceof Timestamp ? a.dueDate.toDate() : new Date(0);
            const dateB = b.dueDate instanceof Timestamp ? b.dueDate.toDate() : new Date(0);
            return dateA.getTime() - dateB.getTime();
          });

        // Fetch user stats if admin
        let totalUsers = 0;
        let activeUsers = 0;
        if (isAdmin) {
          const usersSnapshot = await getDocs(collection(db, "users"));
          totalUsers = usersSnapshot.size;
          activeUsers = usersSnapshot.docs.filter((doc) => doc.data().isActive).length;
        }

        setStats({
          totalTasks: tasks.length,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          totalUsers,
          activeUsers,
        });
        setRecentTasks(sortedTasks.slice(0, 5));
        setUpcomingDeadlines(upcoming.slice(0, 5));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [userId, isAdmin]);

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Loading your workspace...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name}!
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/tasks/create">
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Tasks
                </p>
                <p className="text-3xl font-bold">{stats.totalTasks}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {completionRate}% completed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  In Progress
                </p>
                <p className="text-3xl font-bold">{stats.inProgressTasks}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {stats.completedTasks} tasks completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Overdue
                </p>
                <p className="text-3xl font-bold text-red-500">
                  {stats.overdueTasks}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        {isAdmin ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Team Members
                  </p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {stats.activeUsers} active members
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Completion Rate
                  </p>
                  <p className="text-3xl font-bold">{completionRate}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Keep up the good work!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Your latest task updates</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tasks">
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tasks yet. {isAdmin && "Create your first task!"}
              </p>
            ) : (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getPriorityColor(task.priority)}
                        >
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getStatusLabel(task.status)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(task.updatedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>Tasks due in the next 7 days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar">
                View calendar <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming deadlines. You&apos;re all caught up!
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p
                        className={`text-xs ${getDeadlineColor(task.dueDate)}`}
                      >
                        Due {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={getPriorityColor(task.priority)}
                    >
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
