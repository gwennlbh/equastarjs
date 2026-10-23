import path from "node:path"
import {
  CACHE_DIR,
  Calendar,
  calendars,
  restoreFromCache,
} from "./calendars.js"
import { ical } from "./ical.js"
import { instance, login } from "./instances.js"
import { latestMonday } from "./utils.js"

await restoreFromCache()

console.info(
  `Restored ${calendars.size} calendars from disk (scanned ${path.resolve(CACHE_DIR)})`,
)

if (!process.env.DOMAIN) {
  console.error("Please set the DOMAIN environment variable")
  process.exit(1)
}

Bun.serve({
  port: Number.parseInt(process.env.PORT || "3000"),
  routes: {
    "/calendar/:email/:password": async ({ params, headers }) => {
      const ip =
        headers.get("X-Real-Ip") ||
        headers.get("X-Forwarded-For") ||
        // TODO
        // this.requestIP(req) ||
        "127.0.0.1"

      const { key } = login(params.email, params.password, ip)

      return Response.redirect(`/calendar/${key}/calendar.ics`, 302)
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

        const log = (...args: unknown[]) =>
          console.log(`[${params.key}]`, ...args)

        if (!equastar.userId) {
          log("No userId set, logging in...")
          await equastar.login()
        }

        if (!equastar.userId) {
          throw new Error("No userId set after login()")
        }

        log("request workplace")
        const [workplace] = await equastar.request("getEtablissement", {
          userId: equastar.userId,
        })

        if (!workplace) {
          throw new Error("Workplace not found")
        }

        log("request timetable")
        const timetable = await equastar.request("getPlanningPersonne", {
          etbId: workplace.etb_id,
          dtDeb: latestMonday(new Date()),
          nbJours: 14,
          persId: workplace.id_pers,
          userId: equastar.userId,
        })

        for (const event of timetable) {
          calendar.addFromEquastar(event)
        }

        void calendar.saveToDisk()

        return new Response(ical(calendar.events), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="calendar.ics"',
          },
        })
      } catch (error) {
        console.error(error)
        return new Response(String(error), { status: 500 })
      }
    },
  },

  fetch() {
    return new Response("Not found", { status: 404 })
  },
})
