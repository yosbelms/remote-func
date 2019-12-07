export const hashMap: Map<string, string> = new Map()
export const hashMapFileName = 'hashMap.json'

export const mapToJson = (hashMap: Map<string, string>) => {
  const obj: { [k: string]: string } = {}
  for (let [key, value] of hashMap.entries()) {
    obj[key] = value
  }
  return JSON.stringify(obj, null, 2)
}
