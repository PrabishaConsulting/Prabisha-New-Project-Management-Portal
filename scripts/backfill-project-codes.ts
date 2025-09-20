import { db } from "@/lib/db";

async function main() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "asc" }, // oldest first
  });

  for (let i = 0; i < projects.length; i++) {
    const projectCode = `PCP-${String(i + 1).padStart(4, "0")}`;

    await db.project.update({
      where: { id: projects[i].id },
      data: { projectCode },
    });

    console.log(`Updated ${projects[i].id} -> ${projectCode}`);
  }
}

main()
  .then(() => {
    console.log("Backfill complete ✅");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
