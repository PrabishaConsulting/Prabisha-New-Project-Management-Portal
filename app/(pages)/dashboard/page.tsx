import { getTodaysActivity } from "@/actions/live-Acticvity";
import { Dashboard } from "./_components/Dashboard";
import { getPendingTasksByDepartment } from "@/actions/pending-task-Department";

// Using a more standard naming convention for page components
export default async function DashboardPage() {
    const [todaysActivity, pendingTasksByDept] = await Promise.all([
        getTodaysActivity(0), // Start with first 50 items
        getPendingTasksByDepartment()
    ]);

    return (
        <div>
            <h1>Dashboard</h1>
            <Dashboard 
                TodaysActivity={todaysActivity.data} 
                pendingTasks={pendingTasksByDept.data} 
            />
        </div>
    );
}