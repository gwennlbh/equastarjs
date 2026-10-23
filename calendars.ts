/**
 * @see https://neil.gg/blog/building-an-ical-subscription/
 */

import * as dates from "date-fns"
import { nanoid } from "nanoid"
import { type } from "arktype"
import type { BunFile } from "bun"
import { mkdir } from "node:fs/promises"
import type { Requests } from "./equastar"
import { tz } from "@date-fns/tz"

export const CACHE_DIR = "events"

export async function restoreFromCache() {
  await mkdir(CACHE_DIR, { recursive: true })

  const glob = new Bun.Glob("*.json")
  for await (const file of glob.scan(CACHE_DIR)) {
    const key = file.replace(/\.json$/, "")
    const calendar = new Calendar(key)
    await calendar.restoreFromDisk()
    calendars.set(key, calendar)
  }
}

export const calendars = new Map<string, Calendar>()

export class Calendar {
  key: string
  events: CalEvent[] = []
  cache: BunFile

  constructor(key: string, ...events: CalEvent[]) {
    this.key = key
    this.events = events
    this.cache = Bun.file(`${CACHE_DIR}/${key}.json`)
    void this.saveToDisk()
  }

  async restoreFromDisk() {
    if (!(await this.cache.exists())) {
      return
    }

    const data = await this.cache.json()
    this.events = [...this.events, ...data]
  }

  async saveToDisk() {
    await this.cache.write(JSON.stringify(this.events))
  }

  #eventUid() {
    return `${nanoid()}@${this.key}.${process.env.DOMAIN}`
  }

  addFromEquastar(
    event: (typeof Requests.getPlanningPersonne.response)["infer"]["data"]["RESULT"][number],
  ) {
    const datetime = ([hours, minutes]: readonly [number, number]) => {
      let out = new Date(event.dtplg)
      dates.setMinutes(out, minutes)
      dates.setHours(out, hours)

      return dates.formatISO(out, {
        in: tz("Europe/Paris"),
      })
    }

    if (event.hdebmidi && event.hfinmidi) {
      this.add({
        start: datetime(event.hdebmidi),
        end: datetime(event.hfinmidi),
        summary: "Shift",
        description: `Pause de ${event.tpausemidi} minutes`,
        location: event.etbNom,
        status: "CONFIRMED",
      })
    }

    if (event.hdebsoir && event.hfinsoir) {
      this.add({
        start: datetime(event.hdebsoir),
        end: datetime(event.hfinsoir),
        summary: "Shift",
        description: `Pause de ${event.tpausesoir} minutes`,
        location: event.etbNom,
        status: "CONFIRMED",
      })
    }
  }

  add(event: Omit<(typeof CalEvent)["inferIn"], "uid">) {
    this.events.push({
      ...CalEvent.omit("uid").assert(event),
      uid: this.#eventUid(),
    })

    void this.saveToDisk()
  }
}

export type CalEvent = (typeof CalEvent)["infer"]

const CalEvent = type({
  uid: "string",
  start: "string.date.iso.parse",
  end: "string.date.iso.parse",
  summary: "string",
  description: "string = ''",
  url: "string.url | null = null",
  location: "string = ''",
  // TODO: figure out what values exist
  status: '"CONFIRMED" = "CONFIRMED"',
  createdAt: ["Date", "=", () => new Date()],
})
