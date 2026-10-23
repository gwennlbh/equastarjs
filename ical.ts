import type { CalEvent } from "./calendars"

export function ical(events: CalEvent[]) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:Guilded",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Guilded",
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap((event) => [
      `BEGIN:VEVENT`,
      `UID:${event.uid}`,
      `SUMMARY:${event.summary}`,
      `DTSTAMP:${event.createdAt.toISOString()}`,
      `DTSTART:${event.start.toISOString()}`,
      `DTEND:${event.end.toISOString()}`,
      `DESCRIPTION:${event.description}`,
      // `URL:https://guilded.gg/teams/...`,
      `LOCATION:${event.location}`,
      `STATUS:CONFIRMED`,
      `CREATED:${event.createdAt.toISOString()}`,
      `END:VEVENT`,
    ]),
    "END:VCALENDAR",
  ].join("\n")
}
