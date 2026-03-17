/**
 * Tests for useDragToClose hook.
 * Verifies that a downward swipe from the handle zone triggers onClose,
 * while touches outside the zone or short swipes do not.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDragToClose } from './useDragToClose';

function makeTouchEvent(type: string, clientY: number): React.TouchEvent<HTMLDivElement> {
  return {
    type,
    touches: [{ clientY } as Touch],
    changedTouches: [{ clientY } as Touch],
  } as unknown as React.TouchEvent<HTMLDivElement>;
}

function makeElement(top: number): HTMLDivElement {
  return { getBoundingClientRect: () => ({ top }) } as unknown as HTMLDivElement;
}

describe('useDragToClose', () => {
  it('calls onClose when swiped down beyond threshold from handle zone', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDragToClose(onClose, 72, 48));

    const el = makeElement(100); // modal top at y=100

    // Touch starts at y=120 (20px below top — within 48px handle zone)
    const startEvent = { ...makeTouchEvent('touchstart', 120), currentTarget: el };
    result.current.onTouchStart(startEvent as React.TouchEvent<HTMLDivElement>);

    // Touch ends at y=200 (delta = 80 > threshold 72)
    const endEvent = makeTouchEvent('touchend', 200);
    result.current.onTouchEnd(endEvent);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when swipe is shorter than threshold', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDragToClose(onClose, 72, 48));

    const el = makeElement(100);

    const startEvent = { ...makeTouchEvent('touchstart', 120), currentTarget: el };
    result.current.onTouchStart(startEvent as React.TouchEvent<HTMLDivElement>);

    // Delta = 50 < threshold 72
    const endEvent = makeTouchEvent('touchend', 170);
    result.current.onTouchEnd(endEvent);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when touch starts outside handle zone', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDragToClose(onClose, 72, 48));

    const el = makeElement(100);

    // Touch starts at y=200 (100px below top — outside 48px handle zone)
    const startEvent = { ...makeTouchEvent('touchstart', 200), currentTarget: el };
    result.current.onTouchStart(startEvent as React.TouchEvent<HTMLDivElement>);

    // Large swipe but started outside handle zone
    const endEvent = makeTouchEvent('touchend', 400);
    result.current.onTouchEnd(endEvent);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose on upward swipe', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDragToClose(onClose, 72, 48));

    const el = makeElement(100);

    const startEvent = { ...makeTouchEvent('touchstart', 140), currentTarget: el };
    result.current.onTouchStart(startEvent as React.TouchEvent<HTMLDivElement>);

    // Swipe up (negative delta)
    const endEvent = makeTouchEvent('touchend', 50);
    result.current.onTouchEnd(endEvent);

    expect(onClose).not.toHaveBeenCalled();
  });
});
