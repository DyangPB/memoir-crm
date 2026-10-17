import { calendarItemTitle, type CalendarItem } from "@memoir/core";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { itemChipClass, itemDetails, itemIcon } from "../lib/calendar";
import { cn } from "../lib/utils";
import { Icon } from "./icon";

const POPUP_WIDTH = 288;
const POPUP_MARGIN = 8;
const POPUP_GAP = 6;
/** Room the popup is assumed to need below the chip before it opens above instead. */
const POPUP_HEIGHT_GUESS = 180;

type ItemChipProps = {
  item: CalendarItem;
  today: string;
  /** Picking a chip picks its day, so the day panel shows it in full. */
  onSelect: (day: string) => void;
};

/**
 * One item on a calendar day. Resting the pointer on it, or focusing it, opens a
 * popup describing it; the popup is drawn on the page itself, not inside the grid,
 * which clips anything that spills out of a cell.
 */
export function ItemChip({ item, today, onSelect }: ItemChipProps) {
  const popupId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const details = itemDetails(item, today);

  useEffect(() => {
    if (anchor === null) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAnchor(null);
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [anchor]);

  function open() {
    if (button.current !== null) {
      setAnchor(button.current.getBoundingClientRect());
    }
  }

  const left =
    anchor === null
      ? 0
      : Math.min(Math.max(POPUP_MARGIN, anchor.left), window.innerWidth - POPUP_WIDTH - POPUP_MARGIN);
  const opensAbove = anchor !== null && anchor.bottom + POPUP_HEIGHT_GUESS > window.innerHeight;

  return (
    <li>
      <button
        aria-describedby={anchor === null ? undefined : popupId}
        className={cn(
          "flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          itemChipClass(item, today),
        )}
        onBlur={() => setAnchor(null)}
        onClick={() => onSelect(item.date)}
        onFocus={open}
        onMouseEnter={open}
        onMouseLeave={() => setAnchor(null)}
        ref={button}
        type="button"
      >
        <Icon className="text-base" name={itemIcon(item)} />
        <span className="truncate">{calendarItemTitle(item)}</span>
      </button>
      {anchor !== null &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 flex flex-col gap-1.5 rounded-lg border border-hairline bg-canvas p-3 shadow-panel"
            id={popupId}
            role="tooltip"
            style={{
              left,
              width: POPUP_WIDTH,
              ...(opensAbove
                ? { bottom: window.innerHeight - anchor.top + POPUP_GAP }
                : { top: anchor.bottom + POPUP_GAP }),
            }}
          >
            <p className="text-body-md text-ink">{calendarItemTitle(item)}</p>
            <span
              className={cn(
                "w-fit rounded-full px-2 py-0.5 text-micro-cap uppercase",
                itemChipClass(item, today),
              )}
            >
              {details.kind}
            </span>
            {details.who !== null && <p className="text-caption text-ink-secondary">{details.who}</p>}
            <p className="text-caption tabular-nums text-ink-secondary">{details.when}</p>
            {details.status !== null && (
              <p className="text-caption tabular-nums text-ink-mute">{details.status}</p>
            )}
            {details.extra !== null && (
              <p className="text-caption tabular-nums text-ink-mute">{details.extra}</p>
            )}
          </div>,
          document.body,
        )}
    </li>
  );
}
