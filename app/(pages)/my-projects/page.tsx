import { getActiveWorkspaceId } from "@/utils/workspace-helper";
import ProjectPage from "./_components/project-client-user-specific";
import { getCurrentUser } from "@/utils/getcurrentUser";

export default async function MyProjectPage() {
  // Example: fetch data on the server
  const user = await getCurrentUser()
  const userWorkspaceId = await getActiveWorkspaceId(user?.email || '');

  if (!userWorkspaceId) {
    return <div>Loading...</div>;
  }

  return (
    <main className="p-4">
      <ProjectPage activeWorkspaceId={userWorkspaceId} />
    </main>
  );
}
