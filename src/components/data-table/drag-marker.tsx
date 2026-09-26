"use client";

/**
 * The 2px accent insertion marker with an end dot (docs/PLAN.md §8): a
 * horizontal line between rows, or a vertical line between columns running the
 * full height of the table. Coordinates are relative to the table wrapper.
 */
export interface MarkerPosition {
  orientation: "horizontal" | "vertical";
  /** Offset along the cross axis (top for horizontal, left for vertical). */
  offset: number;
  start: number;
  length: number;
}

export function DragMarker({ marker }: { marker: MarkerPosition | null }) {
  if (!marker) return null;
  const horizontal = marker.orientation === "horizontal";
  return (
    <div
      aria-hidden="true"
      data-testid="drag-marker"
      data-orientation={marker.orientation}
      className="pointer-events-none absolute z-20 bg-brand"
      style={
        horizontal
          ? { top: marker.offset - 1, left: marker.start, width: marker.length, height: 2 }
          : { left: marker.offset - 1, top: marker.start, height: marker.length, width: 2 }
      }
    >
      <span
        className="absolute size-2 rounded-full bg-brand"
        style={horizontal ? { left: -4, top: -3 } : { top: -4, left: -3 }}
      />
    </div>
  );
}
