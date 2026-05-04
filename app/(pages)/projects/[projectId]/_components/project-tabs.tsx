// @/app/(pages)/projects/[projectId]/_components/project-tabs.tsx

import Link from "next/link";
import { 
  type LucideIcon,
  LayoutList,
  KanbanSquare,
  Calendar,
  File,
  NotebookTabs,
  LineChart,
  Book
} from "lucide-react"; // 1. Import all possible icons
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

// An object to map string names to the actual icon components
const iconMap: { [key: string]: LucideIcon } = {
  LayoutList,
  KanbanSquare,
  Calendar,
  File,
  NotebookTabs,
  LineChart,  // Add this line
  Book // Add this line
};

// Update the Tab interface here as well
export interface Tab {
  label: string;
  href: string;
  icon: string; // Icon is a string name
}

interface ProjectTabsProps {
  tabs: Tab[];
}

export function ProjectTabs({ tabs }: ProjectTabsProps) {
    const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = `${pathname}?${searchParams.toString()}`;
  return (
    <nav className="flex items-center space-x-6 border-b border-border">
      {tabs.map((tab) => {
        const isActive = fullPath === tab.href;
        
        // 2. Look up the component from the map using the string name
        const IconComponent = iconMap[tab.icon];
        
        // Safety check in case an icon name is invalid
        if (!IconComponent) {
          return null; 
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 border-b-2 border-transparent px-1 py-3 text-sm font-medium transition-colors",
              "text-muted-foreground hover:text-primary",
              isActive && "text-primary border-primary mb-[-1px]"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {/* 3. Render the looked-up component */}
            <IconComponent className="h-4 w-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}