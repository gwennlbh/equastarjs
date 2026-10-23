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

  // Try a hash

  const hash = new Uint8Array(32)
  Bun.SHA256.hash(email + password, hash)
  let key = hash.toHex()

  if (instances.has(key)) {
    key += `_${nanoid(12)}`
  }

  instances.set(key, instance)

  return { key }
}
