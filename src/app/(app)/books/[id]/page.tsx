
import { getBookById, getPagesByBookId } from "@/lib/data";
import { notFound } from "next/navigation";
import BookDetailClient from "./client";

export default async function BookDetailPage({ params }: { params: { id: string } }) {
    const [book, pages] = await Promise.all([
        getBookById(params.id),
        getPagesByBookId(params.id),
    ]);

    if (!book) {
        notFound();
    }

    return <BookDetailClient book={book} pages={pages} />;
}
