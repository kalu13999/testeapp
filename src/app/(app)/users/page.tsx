
import { getUsers } from "@/lib/data";
import UsersClient from "./client";

export default async function UsersPage() {
  const users = await getUsers();
  // We'll need a list of roles for the form dropdown.
  const roles = [...new Set(users.map(u => u.role))].filter(r => r !== 'System').sort();
  return <UsersClient users={users} roles={roles} />;
}
