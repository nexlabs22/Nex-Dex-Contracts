import { eventArgs } from "@chainlink/test-helpers/dist/src/helpers"
import Contract from "../solidity/contract"

export type ContractEvent = {
  contract: string
  funcName: string
}

export type WokerStatus = {
  contracts: Array<Contract>
  events: Array<ContractEvent>
  mainAccount: string
  sender: string | undefined
}

export let workerStatus: WokerStatus

export function InitWorker({ account }: { account: string }) {
  workerStatus = {
    contracts: [],
    events: [],
    mainAccount: account,
    sender: undefined,
  }
}

export function ContractDeployed({ contract }: { contract: Contract }) {
  workerStatus.contracts.push(contract)
}

export function ContractFunctionCalled({ contract, funcName }: { contract: string; funcName }) {
  workerStatus.events.push({
    contract,
    funcName,
  })
}

export function ContractFunctionEnded({ contract, funcName }: { contract: string; funcName }) {
  const e = workerStatus.events.pop()
  if (!e || e.contract !== contract || e.funcName !== funcName) {
    throw new Error("Error occurred on ContractFunctionEnded.")
  }
}
