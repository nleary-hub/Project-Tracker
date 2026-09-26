import { KeyboardCode, type KeyboardCoordinateGetter } from "@dnd-kit/core";

import type { DragData } from "./types";

/**
 * Arrow-key movement that only considers drop targets of the same kind as the
 * item being dragged (rows move among rows, columns among columns, groups
 * among groups). dnd-kit's stock sortable getter looks at every droppable, so a
 * row could otherwise "move" onto a column header or a department bar.
 */
export const typedKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context: { active, collisionRect, droppableRects, droppableContainers } },
) => {
  const direction = event.code;
  const vertical = direction === KeyboardCode.Up || direction === KeyboardCode.Down;
  const horizontal = direction === KeyboardCode.Left || direction === KeyboardCode.Right;
  if (!active || !collisionRect || (!vertical && !horizontal)) return undefined;
  event.preventDefault();

  const type = (active.data.current as DragData | undefined)?.type;
  let best: { x: number; y: number; distance: number } | null = null;

  for (const container of droppableContainers.getEnabled()) {
    if (container.id === active.id) continue;
    if ((container.data.current as { type?: string } | undefined)?.type !== type) continue;
    // Measured rects can lag the first key press right after pickup; fall back to
    // the container's own measurement so the first arrow press still moves.
    const rect =
      droppableRects.get(container.id) ??
      container.rect.current ??
      container.node.current?.getBoundingClientRect();
    if (!rect) continue;

    let candidate: { x: number; y: number } | null = null;
    if (direction === KeyboardCode.Down && rect.top > collisionRect.top) {
      candidate = { x: collisionRect.left, y: rect.top };
    } else if (direction === KeyboardCode.Up && rect.top < collisionRect.top) {
      candidate = { x: collisionRect.left, y: rect.top };
    } else if (direction === KeyboardCode.Right && rect.left > collisionRect.left) {
      candidate = { x: rect.left, y: collisionRect.top };
    } else if (direction === KeyboardCode.Left && rect.left < collisionRect.left) {
      candidate = { x: rect.left, y: collisionRect.top };
    }
    if (!candidate) continue;

    const distance = Math.hypot(candidate.x - collisionRect.left, candidate.y - collisionRect.top);
    if (!best || distance < best.distance) best = { ...candidate, distance };
  }

  return best ? { x: best.x, y: best.y } : undefined;
};
