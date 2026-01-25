"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { isAdminOrHigher, isSuperAdmin } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Users,
  Bell,
  Settings,
  BarChart3,
  UserPlus,
  Clock,
  FolderKanban,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: "ADMIN" | "SUPER_ADMIN";
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Kanban Board",
    href: "/tasks/board",
    icon: FolderKanban,
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    title: "Timeline",
    href: "/timeline",
    icon: Clock,
  },
  {
    title: "Team",
    href: "/team",
    icon: Users,
    requiredRole: "ADMIN",
  },
  {
    title: "Invite Members",
    href: "/team/invite",
    icon: UserPlus,
    requiredRole: "ADMIN",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    requiredRole: "ADMIN",
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "MEMBER";

  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === "ADMIN") return isAdminOrHigher(userRole);
    if (item.requiredRole === "SUPER_ADMIN") return isSuperAdmin(userRole);
    return false;
  });

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow pt-5 bg-card border-r overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-5">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TaskFlow</span>
          </Link>
        </div>

        <nav className="flex-1 px-2 pb-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 p-4 border-t">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {userRole.toLowerCase().replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
