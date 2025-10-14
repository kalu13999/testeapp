
import { getEnrichedBookById, getPagesByBookId } from "@/lib/data";
import { notFound } from "next/navigation";
import BookDetailClient from "./client";

export default async function BookDetailPage({ params }: { params: { id: string } }) {
    // Although the page is a client component using context,
    // we can still fetch the initial data on the server for faster loads
    // and to handle the case where the book doesn't exist.
    const { id } = await params;
    const book = await getEnrichedBookById(id);

    if (!book) {
        notFound();
    }

    return <BookDetailClient bookId={id} />;
}
