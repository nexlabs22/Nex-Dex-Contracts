import { eventArgs } from "@chainlink/test-helpers/dist/src/helpers"
import Contract from "../solidity/contract"

export type ContractEvent = {
  contract: string
  funcName: string
  called: boolean
}

export type WokerStatus = {
  contracts: Array<Contract>
  latestEvent: ContractEvent
  mainAccount: string
  sender: string | undefined
}

export let WorkerStatus: WokerStatus

export function InitWorker({ account }: { account: string }) {
  WorkerStatus = {
    contracts: [],
    latestEvent: {
      contract: "",
      funcName: "",
      called: false,
    },
    mainAccount: account,
    sender: undefined,
  }
}

export function ContractDeployed({contract}: { contract: Contract}) {
  WorkerStatus.contracts.push(contract);
}

export function ContractFunctionCalled({ contract, funcName }: { contract: string; funcName }) {}

export function ContractFunctionEnded({ contract, funcName }: { contract: string; funcName }) {}