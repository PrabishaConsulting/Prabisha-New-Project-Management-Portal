import { getTodaysActivity } from "@/actions/live-Acticvity";
import { Dashboard } from "./_components/Dashboard";
import { getPendingTasksByDepartment } from "@/actions/pending-task-Department";

// Using a more standard naming convention for page components
export default async function DashboardPage() {
    // --- The Optimization ---
    // Run both data-fetching promises at the same time.
    const [todaysActivity, pendingTasksByDept] = await Promise.all([
        getTodaysActivity(),
        getPendingTasksByDepartment()
    ]);

    // This console.log is still useful for debugging during development
    return (
        <div>
            <h1>Dashboard</h1>
            {/* Pass all the necessary data down to the client component */}
            <Dashboard 
                TodaysActivity={todaysActivity.data} 
                pendingTasks={pendingTasksByDept.data} 
            />
        </div>
    );
}