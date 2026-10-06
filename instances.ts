import { MyEquastar } from "./equastar.js"
import { nanoid } from "nanoid"

const instances = new Map<string, MyEquastar>()

export function instance(key: string) {
  return instances.get(key)
}

export function login(
  email: string,
  password: string,
  ip: string,
): { key: string } {
  for (const [key, instance] of instances.entries()) {
    if (instance.username === email && instance.passwordMatches(password)) {
      return { key }
    }
  }

  const instance = new MyEquastar(email, password, ip)
  const key = nanoid()
  instances.set(key, instance)

  return { key }
}
