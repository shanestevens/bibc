export interface BookmarkedVerseSelection {
  reference: string;
  selectedText: string;
}

export function bookmarkPreview(bookmark: BookmarkedVerseSelection | undefined): string | undefined {
  if (!bookmark) return undefined;
  return bookmark.selectedText
    ? `${bookmark.reference}: ${bookmark.selectedText}`
    : bookmark.reference;
}
