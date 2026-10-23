import path from "node:path"
import * as dates from "date-fns"
import {
  CACHE_DIR,
  Calendar,
  calendars,
  restoreFromCache,
} from "./calendars.js"
import { ical } from "./ical.js"
import { instance, login } from "./instances.js"
import { latestMonday } from "./utils.js"
import type { MyEquastar } from "./equastar.js"
import { type } from "arktype"

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
    "/calendar/:email/:password": async ({ params, headers, url }) => {
      const ip =
        headers.get("X-Real-Ip") ||
        headers.get("X-Forwarded-For") ||
        // TODO
        // this.requestIP(req) ||
        "127.0.0.1"

      const { key } = login(params.email, params.password, ip)

      const { format = "ics", ...rest } = Object.fromEntries(
        new URL(url).searchParams.entries(),
      )

      const query = new URLSearchParams(rest).toString()

      return Response.redirect(
        `/calendar/${key}/calendar.${format}?${query}`,
        302,
      )
    },
    "/calendar/:key/calendar.ics": async ({ params, url }) => {
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
        const calendar = await sync(
          equastar,
          params.key,
          new URL(url).searchParams,
        )

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
    "/calendar/:key/calendar.json": async ({ params, url }) => {
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
        const calendar = await sync(
          equastar,
          params.key,
          new URL(url).searchParams,
        )
        return Response.json(calendar.events)
      } catch (error) {
        console.error(error)
        return new Response(String(error), { status: 500 })
      }
    },
    "/calendar/:key/raw": async ({ params, url }) => {
      const query = new URL(url).searchParams

      const equastar = instance(params.key)
      if (!equastar)
        throw new Error(`Unknown key "${params.key}", please use /login first`)

      const { timetable } = await retrieve(equastar, params.key, query)

      return Response.json(timetable)
    },
  },

  fetch() {
    return new Response("Not found", { status: 404 })
  },
})

const RetrieveQueryParams = type({
  start: ["string.date.iso.parse", "=", () => new Date().toISOString()],
  weeks: type("string.integer.parse").to("number >= 1").default("2"),
})

async function retrieve(
  equastar: MyEquastar,
  key: string,
  query: URLSearchParams = new URLSearchParams(),
) {
  const { start, weeks } = RetrieveQueryParams.assert(
    Object.fromEntries(query.entries()),
  )

  const calendar = calendars.getOrInsertComputed(
    key,
    (key) => new Calendar(key),
  )

  console.log(
    `[${key}] retreving ${dates.format(start, "yyyy-MM-dd")} + [0, ${weeks * 7}]`,
  )

  let freshLogin = false

  if (!equastar.userId) {
    console.log(`[${key}] logging in `)
    freshLogin = true
    await equastar.login()
  }

  if (!equastar.userId) {
    throw new Error("No userId set after login()")
  }

  try {
    const [workplace] = await equastar.request("getEtablissement", {
      userId: equastar.userId,
    })

    if (!workplace) {
      throw new Error("Workplace not found")
    }

    const timetable = await equastar.request("getPlanningPersonne", {
      etbId: workplace.etb_id,
      dtDeb: latestMonday(start),
      nbJours: weeks * 7,
      persId: workplace.id_pers,
      userId: equastar.userId,
    })

    return { calendar, timetable }
  } catch (error) {
    if (!freshLogin) {
      // Probably an expired token
      equastar.clearToken()
      return retrieve(equastar, key, query)
    }

    throw error
  }
}

async function sync(
  equastar: MyEquastar,
  key: string,
  query: URLSearchParams = new URLSearchParams(),
) {
  const { calendar, timetable } = await retrieve(equastar, key, query)

  for (const event of timetable) {
    calendar.addFromEquastar(event)
  }

  void calendar.saveToDisk()

  return calendar
}
