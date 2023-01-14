import { ATTR_TYPE, ATTR_CONTRACT_ADDRESS, ATTR_NAME, ATTR_OWNER_ADDRESS, TYPE_CONTRACT } from "../constant"
import address from "./address"

export default Contract

export declare interface Contract {
  [ATTR_TYPE]: string
  [ATTR_NAME]: string
  [ATTR_CONTRACT_ADDRESS]: string
  [ATTR_OWNER_ADDRESS]: string
}

export function Contract({ name, address, owner}: {name: string, address: string, owner: string}) {

  return {
    [ATTR_TYPE]: TYPE_CONTRACT,
    [ATTR_NAME]: name,
    [ATTR_CONTRACT_ADDRESS]: address,
    [ATTR_OWNER_ADDRESS]: owner,
  }
}

export const isContract = (e: any): boolean => e[ATTR_TYPE] === TYPE_CONTRACT

export const getContractAddress = (e: any): string =>
  isContract(e) ? e[ATTR_CONTRACT_ADDRESS] : address(0)
