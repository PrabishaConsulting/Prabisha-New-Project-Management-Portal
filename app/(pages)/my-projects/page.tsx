import { getActiveWorkspaceId } from "@/utils/workspace-helper";
import ProjectPage from "./_components/project-client-user-specific";
import { getCurrentUser } from "@/utils/getcurrentUser";

export default async function MyProjectPage() {
  // Example: fetch data on the server
  const user = await getCurrentUser()
  console.log("Current user in MyProjectPage:", user);
  const userWorkspaceId = await getActiveWorkspaceId(user?.email || '');
console.log("User workspace ID in MyProjectPage:", userWorkspaceId);
  if (!userWorkspaceId) {
    return <div>Loading...</div>;
  }

  return (
    <main className="p-4">
      <ProjectPage activeWorkspaceId={userWorkspaceId} />
    </main>
  );
}
