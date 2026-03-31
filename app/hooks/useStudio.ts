"use client"

import { useState } from "react"
import type { StudioDocument, StudioMode } from "@/types/studio"

interface CreateDocumentInput {
  workUnitId: string
  title: string
  mode?: StudioMode
  content?: string
}

export function useStudio(initialDocuments: StudioDocument[]) {
  const [documents, setDocuments] = useState(initialDocuments)

  const updateDocumentContent = (id: string, content: string) => {
    setDocuments((prev) =>
      prev.map((document) =>
        document.id === id ? { ...document, content } : document
      )
    )
  }

  const createDocument = ({
    workUnitId,
    title,
    mode = "Draft",
    content = "",
  }: CreateDocumentInput) => {
    const nextId = `doc-${crypto.randomUUID()}`

    setDocuments((prev) => [
      ...prev,
      {
        id: nextId,
        workUnitId,
        title,
        mode,
        content,
      },
    ])

    return nextId
  }

  return {
    documents,
    updateDocumentContent,
    createDocument,
  }
}
