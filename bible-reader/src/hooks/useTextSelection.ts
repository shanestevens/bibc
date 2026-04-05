import { useState, useEffect, useCallback, type RefObject } from 'react';

export interface SelectionData {
  text: string;
  reference: string;
  // Viewport coords for the floating button
  buttonX: number;
  buttonY: number;
}

function extractVerseNums(readingEl: HTMLElement, range: Range): number[] {
  const verseEls = readingEl.querySelectorAll<HTMLElement>('[data-verse-num]');
  const nums: number[] = [];
  for (const el of verseEls) {
    if (range.intersectsNode(el)) {
      const n = Number(el.dataset.verseNum);
      if (n) nums.push(n);
    }
  }
  return nums;
}

function buildReference(bookName: string, chapterNum: number, verseNums: number[]): string {
  if (!verseNums.length) return `${bookName} ${chapterNum}`;
  const min = Math.min(...verseNums);
  const max = Math.max(...verseNums);
  return min === max
    ? `${bookName} ${chapterNum}:${min}`
    : `${bookName} ${chapterNum}:${min}–${max}`;
}

export function useTextSelection(
  readingRef: RefObject<HTMLElement | null>,
  bookName: string,
  chapterNum: number,
): {
  selection: SelectionData | null;
  clearSelection: () => void;
} {
  const [selection, setSelection] = useState<SelectionData | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    function tryCapture() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelection(null);
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 3) {
        setSelection(null);
        return;
      }

      // Only act on selections within the reading area
      const el = readingRef.current;
      if (!el) return;
      const anchor = sel.anchorNode;
      const focus = sel.focusNode;
      if (!anchor || !focus || !el.contains(anchor) || !el.contains(focus)) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) return;

      const verseNums = extractVerseNums(el, range);
      const reference = buildReference(bookName, chapterNum, verseNums);

      // Position button centered below the selection (iOS system menu appears above)
      const btnW = 160; // approximate button width
      const margin = 8;
      const rawX = rect.left + rect.width / 2 - btnW / 2;
      const clampedX = Math.max(margin, Math.min(rawX, window.innerWidth - btnW - margin));
      const btnY = rect.bottom + 12;

      setSelection({ text, reference, buttonX: clampedX, buttonY: btnY });
    }

    // Desktop: fire on mouseup
    function onMouseUp(e: MouseEvent) {
      // Small delay so selection is finalised
      setTimeout(() => {
        // Ignore clicks inside the ask panel itself
        const target = e.target as HTMLElement;
        if (target.closest('.ask-panel') || target.closest('.selection-btn')) return;
        tryCapture();
      }, 10);
    }

    // Mobile: fire on touchend
    function onTouchEnd(e: TouchEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('.ask-panel') || target.closest('.selection-btn')) return;
      // Longer delay on mobile — browser needs time to show handles and finalise
      setTimeout(tryCapture, 300);
    }

    // Clear on clicks that aren't in the reading area
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) setSelection(null);
    }

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('selectionchange', onSelectionChange);

    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [readingRef, bookName, chapterNum]);

  return { selection, clearSelection };
}
