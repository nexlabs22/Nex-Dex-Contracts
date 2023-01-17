import Contract, { getContractAddress } from "../solidity/contract"

export type ContractEvent = {
  address: string
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

export function ContractFunctionCalled({ address, funcName }: { address: string; funcName: string }) {
  workerStatus.events.push({
    address,
    funcName,
  })
}

export function ContractFunctionEnded({ address, funcName }: { address: string; funcName: string }) {
  const e = workerStatus.events.pop()
  if (!e || e.address !== address || e.funcName !== funcName) {
    throw new Error("Error occurred on ContractFunctionEnded.")
  }

  if (workerStatus.events.length === 0 && workerStatus.sender) {
    workerStatus.sender = undefined
  }
}

export function ContractSenderChanged({ address, sender }: { address: string; sender: string }) {
  workerStatus.sender = sender
}

export function GetCurrentSender() {
  return workerStatus.sender || workerStatus.mainAccount
}

export function GetContractByAddress({address}: {address: string}) {
  return workerStatus.contracts.find(contract => getContractAddress(contract) === address)
}

export function GetCurrentContract() {
  if (workerStatus.events.length === 0) return undefined

  const e = workerStatus.events[workerStatus.events.length - 1]
  return GetContractByAddress({
    address: e.address
  });
}