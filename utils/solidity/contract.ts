import {
  ATTR_TYPE,
  ATTR_CONTRACT_ADDRESS,
  ATTR_NAME,
  ATTR_OWNER_ADDRESS,
  TYPE_CONTRACT,
  ATTR_CONTRACT_PRINTSTATUS,
  ATTR_CONTRACT_TOKEN,
} from "../constant"
import address from "./address"
import { AddContractProxy } from "../core"
import uint256 from "./uint256"
import { ContractDeployed } from "../core/worker"

export default Contract

interface AddressToUint256 {
  [index: string]: uint256
}

export declare interface Contract {
  [ATTR_TYPE]: string
  [ATTR_NAME]: string
  [ATTR_CONTRACT_ADDRESS]: string
  [ATTR_OWNER_ADDRESS]: string
  [ATTR_CONTRACT_TOKEN]: AddressToUint256
  [ATTR_CONTRACT_PRINTSTATUS]: () => void
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
    [ATTR_CONTRACT_TOKEN]: {},
    [ATTR_CONTRACT_PRINTSTATUS]: () => {},
  }

  contract = AddSmartContractFunctions(contract)
  contract = AddDebugFunctions(contract)
  contract = AddContractProxy(contract)

  ContractDeployed(contract as Contract)

  return contract
}

export const IsContract = (e: any): boolean => e && e[ATTR_TYPE] === TYPE_CONTRACT

export const GetContractAddress = (e: any): string =>
  IsContract(e) ? e[ATTR_CONTRACT_ADDRESS] : address(0)

export const GetContractName = (e: any): string => (IsContract(e) ? e[ATTR_NAME] : "")

export const GetContractOwner = (e: any): string => (IsContract(e) ? e[ATTR_OWNER_ADDRESS] : "")

export const AirdropToken = (e: any, token: string, amount: uint256) => {
  if (!IsContract(e)) return

  if (!e[ATTR_CONTRACT_TOKEN][token]) {
    e[ATTR_CONTRACT_TOKEN][token] = uint256(0)
  }

  e[ATTR_CONTRACT_TOKEN][token] = e[ATTR_CONTRACT_TOKEN][token].plus(amount)
}
