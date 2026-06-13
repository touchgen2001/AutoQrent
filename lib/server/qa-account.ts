type Metadata = Record<string, unknown> | null | undefined

export function isQaAuthMetadata(metadata: Metadata) {
  return metadata?.isQaAccount === true
}

export function isQaGalleryRow(row: { is_qa_account?: boolean | null }) {
  return row.is_qa_account === true
}
