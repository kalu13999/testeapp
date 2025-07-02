
import BookManagementClient from "./client";

export default function BookManagementPage() {
  // This component is now fully client-side and uses context for its data.
  // No server-side data fetching is needed here.
  return <BookManagementClient />;
}
