import { useRef, useCallback } from 'react';

/**
 * Returns touch event props to spread on a bottom-sheet modal-box div.
 * Closing is triggered when the user swipes down ≥ `threshold` px,
 * starting from within the top `handleZone` px of the element (drag handle area).
 */
export function useDragToClose(
  onClose: () => void,
  threshold = 72,
  handleZone = 48,
) {
  const startY = useRef<number | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const touchY = e.touches[0].clientY;
      if (touchY - rect.top <= handleZone) {
        startY.current = touchY;
      }
    },
    [handleZone],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (startY.current === null) return;
      const delta = e.changedTouches[0].clientY - startY.current;
      if (delta >= threshold) onClose();
      startY.current = null;
    },
    [onClose, threshold],
  );

  return { onTouchStart, onTouchEnd };
}
