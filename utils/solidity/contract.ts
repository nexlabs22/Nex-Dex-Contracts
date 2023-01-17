import {
  ATTR_TYPE,
  ATTR_CONTRACT_ADDRESS,
  ATTR_NAME,
  ATTR_OWNER_ADDRESS,
  TYPE_CONTRACT,
} from "../constant"
import address from "./address"
import { AddContractProxy } from "../core"

export default Contract

export declare interface Contract {
  [ATTR_TYPE]: string
  [ATTR_NAME]: string
  [ATTR_CONTRACT_ADDRESS]: string
  [ATTR_OWNER_ADDRESS]: string
}

export function Contract({
  name,
  address,
  owner,
  AddSmartContractFunctions,
  AddDebugFunctions,
}: {
  name: string
  address: string
  owner: string
  AddSmartContractFunctions: (contract: any) => any
  AddDebugFunctions: (contract: any) => any
}) {
  let contract = {
    [ATTR_TYPE]: TYPE_CONTRACT,
    [ATTR_NAME]: name,
    [ATTR_CONTRACT_ADDRESS]: address,
    [ATTR_OWNER_ADDRESS]: owner,
  }

  contract = AddSmartContractFunctions(contract)
  contract = AddDebugFunctions(contract)
  contract = AddContractProxy(contract)

  return contract
}

export const isContract = (e: any): boolean => e[ATTR_TYPE] === TYPE_CONTRACT

export const getContractAddress = (e: any): string =>
  isContract(e) ? e[ATTR_CONTRACT_ADDRESS] : address(0)

export const getContractName = (e: any): string => (isContract(e) ? e[ATTR_NAME] : "")

export const getContractOwner = (e: any): string => (isContract(e) ? e[ATTR_OWNER_ADDRESS] : "")