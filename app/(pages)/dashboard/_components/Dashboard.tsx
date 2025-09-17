import { DepartmentPendingTasksChart } from "./task-status-chart"
import { LiveActivity } from "./User-live-activity"

export const Dashboard = ({TodaysActivity , pendingTasks} : {TodaysActivity : any , pendingTasks : any}) => {
    if (!TodaysActivity || !pendingTasks) {
        return <div>Loading...</div>
    }
    return (
        <div className=" grid grid-cols-2 gap-4">
            <LiveActivity TodaysLiveActivity={TodaysActivity}/>
            <DepartmentPendingTasksChart pendingTasks={pendingTasks}/>
        </div>
    )
}