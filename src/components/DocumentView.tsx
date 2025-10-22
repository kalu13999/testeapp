"use client";

import { useEffect, useState } from "react";

export default function DocumentView({ id }: { id: string }) {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    // Aqui normalmente farias uma chamada à API para buscar o documento
    setTimeout(() => {
      setContent(`📄 Documento #${id}\n\nEste é o conteúdo do documento simulado.`);
    }, 400);
  }, [id]);

  return (
    <div className="text-gray-800 whitespace-pre-wrap">
      {content || "Carregando documento..."}
    </div>
  );
}
