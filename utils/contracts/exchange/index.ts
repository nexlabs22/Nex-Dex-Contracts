import { ATTR_NAME, ATTR_TYPE, CONTRACT_DEX, TYPE_CONTRACT } from "../../constant"
import { Contract } from "../../solidity"
import AddSmartContractFunctions from "./contract"
import AddDebugFunctions from "./debug"

export default function ({ address, usdc }: { address: string; usdc: string }) {
  let contract = Contract(CONTRACT_DEX, address) as any

  contract = AddSmartContractFunctions(contract)
  contract = AddDebugFunctions(contract)

  // initialize the contract
  contract.constructor(
    "", // nftOracle contract address
    "", // priceFeed contract address
    usdc
  )

  return contract
}
