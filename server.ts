import { Requests } from "./equastar.js"
import { login, instance } from "./instances.js"
import { Calendar, calendars } from "./calendars.js"

Bun.serve({
  port: Number.parseInt(process.env.PORT || "3000"),
  routes: {
    "/login": async (req) => {
      const data = Requests.auth.request.omit("ip").assert(await req.json())

      const ip =
        req.headers.get("X-Real-Ip") ||
        req.headers.get("X-Forwarded-For") ||
        // TODO
        // this.requestIP(req) ||
        "127.0.0.1"

      return Response.json(login(data.username, data.password, ip))
    },
    "/calendar/:key/calendar.ics": async ({ params }) => {
      const equastar = instance(params.key)
      if (!equastar) {
        return new Response(
          `Unknown key "${params.key}", please use /login first`,
          {
            status: 404,
          },
        )
      }

      try {
        const calendar = calendars.getOrInsertComputed(
          params.key,
          (key) => new Calendar(key),
        )

        if (!equastar.userId) {
          await equastar.login()
        }

        if (!equastar.userId) {
          throw new Error("No userId set after login()")
        }

        const [workplace] = await equastar.request("workplace", {
          userId: equastar.userId,
        })

        if (!workplace) {
          throw new Error("Workplace not found")
        }

        const timetable = await equastar.request("timetable", {
          etbId: workplace.etb_id,
          dtDeb: new Date(),
          nbJours: 7,
          persId: workplace.id_pers,
          userId: equastar.userId,
        })

        for (const event of timetable) {
          calendar.addFromEquastar(event)
        }

        return new Response(
          [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "CALSCALE:GREGORIAN",
            "PRODID:Guilded",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:Guilded",
            "X-PUBLISHED-TTL:PT1H",
            ...calendar.events.flatMap((event) => [
              `BEGIN:VEVENT`,
              `UID:${event.uid}`,
              `SUMMARY:${event.summary}`,
              `DTSTAMP:${event.createdAt.toISOString()}`,
              `DTSTART:${event.start.toISOString()}`,
              `DTEND:${event.start.toISOString()}`,
              `DESCRIPTION:${event.description}`,
              // `URL:https://guilded.gg/teams/...`,
              `LOCATION:${event.location}`,
              `STATUS:CONFIRMED`,
              `CREATED:${event.createdAt.toISOString()}`,
              `END:VEVENT`,
            ]),
            "END:VCALENDAR",
          ].join("\n"),
          {
            headers: {
              "Content-Type": "text/calendar; charset=utf-8",
              "Content-Disposition": 'attachment; filename="calendar.ics"',
            },
          },
        )
      } catch (error) {
        return new Response(String(error), { status: 500 })
      }
    },
  },

  fetch() {
    return new Response("Not found", { status: 404 })
  },
})
