import StorageClient from "./client";

export default async function StoragePage() {
    // The client component gets all its data from the context,
    // so we don't need to pass any props from the server component.
    return <StorageClient />;
}
