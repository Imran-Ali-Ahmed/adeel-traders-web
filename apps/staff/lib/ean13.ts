// EAN-13 barcode encoder (the standard retail barcode). No library needed: it is a fixed table.
const L = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
]
const G = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
]
const R = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
]
// Which table (L or G) each of the 6 left digits uses, picked by the first digit.
const PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
]

export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const sum = [...code.slice(0, 12)].reduce(
    (s, d, i) => s + Number(d) * (i % 2 ? 3 : 1),
    0
  )
  return (10 - (sum % 10)) % 10 === Number(code[12])
}

/** 95 modules of 0/1 for a valid EAN-13, or null if the code is not a valid EAN-13. */
export function ean13Modules(code: string): string | null {
  if (!isValidEan13(code)) return null
  const digits = [...code].map(Number)
  const parity = PARITY[digits[0]!]!
  const left = digits
    .slice(1, 7)
    .map((d, i) => (parity[i] === "L" ? L[d] : G[d]))
    .join("")
  const right = digits
    .slice(7)
    .map((d) => R[d])
    .join("")
  return `101${left}01010${right}101`
}
