"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskStatus, KanbanColumn } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, GripVertical } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  formatDate,
  getDeadlineColor,
  getPriorityColor,
  getPriorityLabel,
  getInitials,
  isAdminOrHigher,
} from "@/lib/utils";
import { toast } from "sonner";

const COLUMN_ORDER: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "COMPLETED",
];

const COLUMN_TITLES: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
};

const COLUMN_COLORS: Record<TaskStatus, string> = {
  TODO: "border-t-slate-500",
  IN_PROGRESS: "border-t-blue-500",
  IN_REVIEW: "border-t-purple-500",
  BLOCKED: "border-t-red-500",
  COMPLETED: "border-t-green-500",
};

export default function KanbanBoardPage() {
  const { data: session } = useSession();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userRole = session?.user?.role || "MEMBER";
  const userId = session?.user?.id;
  const isAdmin = isAdminOrHigher(userRole);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId) return;

      try {
        let tasksQuery;
        if (isAdmin) {
          tasksQuery = query(collection(db, "tasks"));
        } else {
          tasksQuery = query(
            collection(db, "tasks"),
            where("assigneeId", "==", userId)
          );
        }

        const snapshot = await getDocs(tasksQuery);
        const tasks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];

        // Organize tasks into columns
        const columnsData: KanbanColumn[] = COLUMN_ORDER.map((status) => ({
          id: status,
          title: COLUMN_TITLES[status],
          tasks: tasks.filter((task) => task.status === status),
        }));

        setColumns(columnsData);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [userId, isAdmin]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newColumns = [...columns];
    const sourceColumn = newColumns.find((col) => col.id === source.droppableId);
    const destColumn = newColumns.find((col) => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const [movedTask] = sourceColumn.tasks.splice(source.index, 1);
    movedTask.status = destination.droppableId as TaskStatus;
    destColumn.tasks.splice(destination.index, 0, movedTask);

    setColumns(newColumns);

    // Update in Firebase
    try {
      await updateDoc(doc(db, "tasks", draggableId), {
        status: destination.droppableId as TaskStatus,
        updatedAt: Timestamp.now(),
        ...(destination.droppableId === "COMPLETED"
          ? { completedAt: Timestamp.now() }
          : {}),
      });
      toast.success("Task updated");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
      // Revert the change
      const revertColumns = [...columns];
      const revertSourceColumn = revertColumns.find(
        (col) => col.id === source.droppableId
      );
      const revertDestColumn = revertColumns.find(
        (col) => col.id === destination.droppableId
      );
      if (revertSourceColumn && revertDestColumn) {
        const [revertTask] = revertDestColumn.tasks.splice(destination.index, 1);
        revertTask.status = source.droppableId as TaskStatus;
        revertSourceColumn.tasks.splice(source.index, 0, revertTask);
        setColumns(revertColumns);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kanban Board</h1>
            <p className="text-muted-foreground">Loading your tasks...</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMN_ORDER.map((status) => (
            <div
              key={status}
              className="flex-shrink-0 w-72 bg-muted rounded-lg p-4 animate-pulse"
            >
              <div className="h-6 bg-muted-foreground/20 rounded mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted-foreground/10 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kanban Board</h1>
          <p className="text-muted-foreground">
            Drag and drop tasks to update their status
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div
              key={column.id}
              className={`flex-shrink-0 w-72 bg-muted/50 rounded-lg border-t-4 ${COLUMN_COLORS[column.id]}`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary">{column.tasks.length}</Badge>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[500px] ${
                        snapshot.isDraggingOver ? "bg-muted/80 rounded-lg" : ""
                      }`}
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${
                                snapshot.isDragging
                                  ? "shadow-lg rotate-2"
                                  : "hover:shadow-md"
                              } transition-all`}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start gap-2">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-1 cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <Link
                                      href={`/tasks/${task.id}`}
                                      className="font-medium text-sm hover:underline line-clamp-2"
                                    >
                                      {task.title}
                                    </Link>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${getPriorityColor(
                                          task.priority
                                        )}`}
                                      >
                                        {getPriorityLabel(task.priority)}
                                      </Badge>
                                    </div>
                                    {task.dueDate && (
                                      <p
                                        className={`text-xs ${getDeadlineColor(
                                          task.dueDate
                                        )}`}
                                      >
                                        Due {formatDate(task.dueDate)}
                                      </p>
                                    )}
                                    {task.assigneeName && (
                                      <div className="flex items-center gap-2 pt-1">
                                        <Avatar className="h-5 w-5">
                                          <AvatarImage
                                            src={task.assigneeAvatar || undefined}
                                          />
                                          <AvatarFallback className="text-xs">
                                            {getInitials(task.assigneeName)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground">
                                          {task.assigneeName}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
