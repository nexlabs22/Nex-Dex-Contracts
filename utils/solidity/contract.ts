import { ATTR_TYPE, ATTR_CONTRACT_ADDRESS, ATTR_NAME, TYPE_CONTRACT } from "../constant"
import address from "./address"

export default Contract

export declare interface Contract {
  [ATTR_TYPE]: string
  [ATTR_NAME]: string
  [ATTR_CONTRACT_ADDRESS]: string
}

export function Contract() {}

export const isContract = (e: any): boolean => e[ATTR_TYPE] === TYPE_CONTRACT

export const getContractAddress = (e: any): string =>
  isContract(e) ? e[ATTR_CONTRACT_ADDRESS] : address(0)
