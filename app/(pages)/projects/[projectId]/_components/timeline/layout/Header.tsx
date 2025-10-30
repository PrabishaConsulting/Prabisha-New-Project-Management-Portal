// components/layout/Header.tsx
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onRefresh?: () => void;
  projectName?: string;
}

export default function Header({ onRefresh, projectName }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{projectName || 'Project Timeline'}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
          <span className="text-sm text-muted-foreground">Active Project</span>
        </div>
      </div>
      <div className="flex gap-2">
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        )}
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>
    </header>
  );
}