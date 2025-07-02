
import { getProjects, getBooks } from "@/lib/data";
import BookManagementClient from "./client";

export default async function BookManagementPage() {
  const [projects, books] = await Promise.all([
      getProjects(),
      getBooks()
  ]);

  return <BookManagementClient projects={projects} initialBooks={books} />;
}
