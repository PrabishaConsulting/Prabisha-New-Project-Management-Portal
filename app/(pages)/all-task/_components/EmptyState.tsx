import { FolderKanban } from "lucide-react";

export const EmptyState = () => (
  <div className="text-center py-16 border-2 border-dashed rounded-lg">
    <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-medium">No Active Tasks Here</h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Looks like you're all caught up in this category!
    </p>
  </div>
);