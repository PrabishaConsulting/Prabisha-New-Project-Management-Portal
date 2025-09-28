# Task Analytics Area Graph

A dynamic area graph implementation for visualizing user task creation and completion trends over time.

## Features

- **User-specific Analytics**: Individual task analytics for each user
- **Date-wise Visualization**: Tasks grouped by creation and completion dates
- **Area Graph Display**: Visual comparison of created vs completed tasks
- **Server-side Processing**: Efficient data aggregation and sorting

## Implementation

### Server Function
```typescript
function getTaskAnalytics(userId: string, timeframe: string): ChartData[]
```

**Parameters:**
- `userId`: User identifier for task filtering
- `timeframe`: Time period for data analysis

**Process:**
1. Fetch all tasks assigned to the user
2. Group tasks by status (done vs pending/in-progress)
3. Aggregate tasks by creation and completion dates
4. Return sorted chart data

### Data Format
```typescript
const chartData = allDates
  .sort()
  .map(date => ({
    date,
    created: createdTasksByDate[date] || 0,
    completed: completedTasksByDate[date] || 0,
  }));
```

## Usage

```typescript
// Get user's task analytics
const userId = getCurrentUserId();
const data = await getTaskAnalytics(userId, 'month');

// Render area graph
<AreaGraph data={data} />
```

## Output Structure

Each data point contains:
- `date`: Date string (YYYY-MM-DD)
- `created`: Number of tasks created on that date
- `completed`: Number of tasks completed on that date

---

**File:** `user.ts` | **Component:** `all-user/[userId]/page.tsx`




# Public Api for Other Application