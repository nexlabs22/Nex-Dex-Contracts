import { GetContractAddress, IsContract } from "./contract"

export default address

export declare interface address extends String {}

export function address(value: number | string | any) {
  if (value === 0) return undefined
  if (typeof value === "string") return value
  if (IsContract(value)) return GetContractAddress(value)
  return ""
}
