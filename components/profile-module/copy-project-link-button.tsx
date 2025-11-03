'use client';

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

// This component only needs the projectId to function
export default function CopyProjectLinkButton({ projectId , workspaceId }: { projectId: string , workspaceId : string}) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    // window.location.origin is safe to use here because this is a Client Component
    const projectUrl = `${window.location.origin}/projects/${projectId}/board?workspaceId=${workspaceId}`;
    
    navigator.clipboard.writeText(projectUrl).then(() => {
      toast.success("Project link copied to clipboard!");
      setIsCopied(true);
      // Reset the checkmark icon after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error("Failed to copy link:", err);
      toast.error("Failed to copy link.");
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-8 w-8"
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">Copy project link</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy project link</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}