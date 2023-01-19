import { ATTR_CONTRACT_PRINTSTATUS } from "../constant"
import Contract, { GetContractAddress, GetContractName } from "../solidity/contract"

export type ContractEvent = {
  address: string
  funcName: string
}

export type WokerStatus = {
  contracts: Array<Contract>
  events: Array<ContractEvent>
  mainAccount: string
  sender: string | undefined

  debug: any
}

// All testing status are stored in this object
export let workerStatus: WokerStatus


// Init Worker Status Object
export function InitWorker({ account }: { account: string }) {
  workerStatus = {
    contracts: [],
    events: [],
    mainAccount: account,
    sender: undefined,
    
    debug: {
      trackFunction: true
    }
  }
}

// Called when contract is deployed
// Save the contract information to wokerStatus
export function ContractDeployed({ contract }: { contract: Contract }) {
  workerStatus.contracts.push(contract)
}


// Called when contract's function started
// Push the new event to workerstatus events array
// Log function and contract information if debug is enabled
export function ContractFunctionCalled({ address, funcName }: { address: string; funcName: string }) {
  workerStatus.events.push({
    address,
    funcName,
  })

  if (workerStatus.debug.trackFunction) {
    const prefix = "→ ".repeat(workerStatus.events.length)
    console.log(`${prefix}${funcName} Started (${GetContractName(GetContractByAddress({address}))})`)
  }
}


// Called when contract's function ended
// Pop up the latest event from workerstatus events array
// Log function and contract information if debug is enabled
// Initialize the sender if events is empty
export function ContractFunctionEnded({ address, funcName }: { address: string; funcName: string }) {
  // pop up the latest event
  const e = workerStatus.events.pop()
  if (!e || e.address !== address || e.funcName !== funcName) {
    throw new Error("Error occurred on ContractFunctionEnded.")
  }

  // initialize sender if events is empty
  if (workerStatus.events.length === 0 && workerStatus.sender) {
    workerStatus.sender = undefined
  }

  // log function and contract information if debug is enabled
  if (workerStatus.debug.trackFunction) {
    const prefix = "→ ".repeat(workerStatus.events.length + 1)
    console.log(`${prefix}${funcName} Ended (${GetContractName(GetContractByAddress({address}))})`)
    
    if (workerStatus.events.length === 0 && workerStatus.sender) {
      console.log("Msg Sender Initialized")
    }
  }
}

// Called when msg sender is changed (exchange.connect(...))
// It is from contract proxy
export function ContractSenderChanged({ address, sender }: { address: string; sender: string }) {  
  // Save sender information in Worker Status
  workerStatus.sender = sender

  // Log information
  if (workerStatus.debug.trackFunction) {
    console.log("Msg Sender Changed : ", sender)
  }
}

// Called from contract function inside (msg.sender)
export function GetCurrentSender() {
  return workerStatus.sender || workerStatus.mainAccount
}

// Search contract address by address
export function GetContractByAddress({address}: {address: string}) {
  return workerStatus.contracts.find(contract => GetContractAddress(contract) === address)
}

// Return the current contract running
export function GetCurrentContract() {
  if (workerStatus.events.length === 0) return undefined

  const e = workerStatus.events[workerStatus.events.length - 1]
  return GetContractByAddress({
    address: e.address
  })
}

// Print the contract status
export function PrintContractStatus({ contract }: { contract: Contract | string }) {
  let obj
  if (typeof contract === "string") {
    obj = GetContractByAddress({
      address: contract,
    })
  } else obj = contract
  if (obj) obj[ATTR_CONTRACT_PRINTSTATUS]()
}

// Enable/Disable debug mode
export function SetTrackDebugFlag(flag: boolean) {
  workerStatus.debug.trackFunction = flag
}
