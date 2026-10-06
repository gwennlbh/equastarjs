import { scope } from "arktype"

import { addMinutes } from "date-fns"
import * as dates from "date-fns"
import { CACHE_DIR, calendars, restoreFromCache } from "./calendars.js"

await restoreFromCache()

console.info(`Restored ${calendars.size} from disk (scanned ./${CACHE_DIR})`)

const type = scope({
  ID: "number.integer>=0",
  ToConcatDate: [
    "Date",
    "=>",
    (date) => Number.parseInt(dates.format(date, "yyyyMMdd")),
  ],
  MinutesStamp: [
    "number.integer",
    "=>",
    (minutes) => {
      if (minutes === 0) return null
      return [Math.floor(minutes / 60), minutes % 60]
    },
  ],
}).type

export class MyEquastar {
  #token: string | undefined
  #tokenExpiresAt: Date | undefined
  userId: number | undefined

  constructor(
    public username: string,
    private password: string,
    private ip: string,
  ) {}

  passwordMatches(password: string) {
    return this.password === password
  }

  async request<S extends Service>(
    service: S,
    args: (typeof Requests)[S]["request"]["inferIn"]["data"],
  ): Promise<(typeof Requests)[S]["response"]["infer"]["data"]["RESULT"]> {
    if (
      !this.#token ||
      !this.#tokenExpiresAt ||
      dates.isFuture(this.#tokenExpiresAt)
    ) {
      await this.login(this.username, this.password, this.ip)
    }

    const raw = await this.fetch(
      "/post",
      Requests[service].request.assert({
        nom: service,
        data: args,
      }),
    )

    const { auth, data } = Requests[service].response.assert(raw)

    this.#setToken(auth)

    return data.RESULT
  }

  async login(username?: string, password?: string, ip?: string) {
    const response = await this.fetch(
      "/auth",
      Requests.auth.request.assert({
        username: username ?? this.username,
        password: password ?? this.password,
        ip: ip ?? this.ip,
      }),
    )

    const { auth, data } = Requests.auth.response.assert(response)

    this.#setToken(auth)
    this.userId = data.RESULT[0]?.IDUSER

    return { userId: data.RESULT[0]?.IDUSER }
  }

  #setToken(auth: (typeof Requests)[Service]["response"]["infer"]["auth"]) {
    this.#token = auth.idToken
    this.#tokenExpiresAt = addMinutes(new Date(), auth.expiresIn - 1)
  }

  async fetch(pathname: `/${string}`, body: unknown) {
    const response = await fetch(`https://my.equastar.fr/api${pathname}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: this.#token
        ? {
            Authorization: `Bearer ${this.#token}`,
          }
        : undefined,
    })

    if (!response.ok) {
      throw new Error(
        `${response.url}: HTTP ${response.status}: ${await response.text()}`,
      )
    }

    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`Response is invalid JSON: ${text}`)
    }
  }
}

const Response = type("<t>", {
  auth: { idToken: "string", expiresIn: "number" },
  data: { RESULT: "t[]" },
})

const ServiceRequest = type("<name extends string, data>", {
  nom: "name",
  data: "data",
})

type Service = Exclude<keyof typeof Requests, "auth">

export const Requests = {
  auth: {
    request: type({ username: "string", password: "string", ip: "string.ip" }),
    response: Response({ IDUSER: "ID" }),
  },
  workplace: {
    request: ServiceRequest("'getEtablissement'", { userId: "ID" }),
    response: Response({
      nom: "string",
      id_pers: "ID",
      etb_id: "ID",
    }),
  },
  timetable: {
    request: ServiceRequest("'getPlanningPersonne'", {
      etbId: "ID",
      userId: "ID",
      dtDeb: "ToConcatDate",
      nbJours: "number.integer > 0",
      //   nbJours: "7"
      persId: "ID",
    }),
    response: Response({
      hdebmidi: "MinutesStamp",
      hfinmidi: "MinutesStamp",
      tpausemidi: ["number", "=>", (x) => -x],
      hdebsoir: "MinutesStamp",
      hfinsoir: "MinutesStamp",
      etbNom: "string",
      tpausesoir: ["number", "=>", (x) => -x],
      dtplg: ["string", "=>", (s) => dates.parse(s, "dd/MM/yyyy", new Date())],
    }),
  },
} as const
