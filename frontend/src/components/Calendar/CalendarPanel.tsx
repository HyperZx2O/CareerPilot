// ─── CalendarPanel — dynamically loaded to avoid SSR hydration issues ─────────
// This wrapper component is only used for the FullCalendar block.
"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";

interface CalendarPanelProps {
  events: EventInput[];
  onDateClick: (arg: DateClickArg) => void;
  onEventClick?: (arg: EventClickArg) => void;
}

export default function CalendarPanel({
  events,
  onDateClick,
  onEventClick,
}: CalendarPanelProps) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={events}
      dateClick={onDateClick}
      eventClick={onEventClick}
      headerToolbar={{
        left: "title",
        right: "prev,next",
      }}
      height="auto"
      selectable={true}
      fixedWeekCount={false}
    />
  );
}
