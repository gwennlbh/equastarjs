import * as dates from "date-fns"

export function latestMonday(date: Date) {
  if (dates.isMonday(date)) return date
  return dates.previousMonday(date)
}
