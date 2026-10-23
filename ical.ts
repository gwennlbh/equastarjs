import * as dates from "date-fns"
import type { CalEvent } from "./calendars"

export function ical(events: CalEvent[]) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `PRODID:${process.env.DOMAIN}`,
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${process.env.DOMAIN}`,
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap((event) => [
      `BEGIN:VEVENT`,
      `UID:${event.uid}`,
      `SUMMARY:${event.summary}`,
      `DTSTAMP:${datetime(event.createdAt)}`,
      `DTSTART:${datetime(event.start)}`,
      `DTEND:${datetime(event.end)}`,
      `DESCRIPTION:${event.description}`,
      // `URL:https://guilded.gg/teams/...`,
      `LOCATION:${event.location}`,
      `STATUS:CONFIRMED`,
      `CREATED:${datetime(event.createdAt)}`,
      `END:VEVENT`,
    ]),
    "END:VCALENDAR",
  ].join("\n")
}

function datetime(date: Date) {
  return dates.format(date, "yyyyMMdd'T'HHmmss'Z'")
}
