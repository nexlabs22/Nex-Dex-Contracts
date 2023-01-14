import { ATTR_NAME, ATTR_TYPE, CONTRACT_DEX, TYPE_CONTRACT } from "../../constant"
import { Contract } from "../../solidity"
import AddSmartContractFunctions from "./contract"
import AddDebugFunctions from "./debug"

export default function ({ address, usdc, account }: { address: string; usdc: string, account: string }) {
  let contract = Contract(
    {
      name: CONTRACT_DEX,
      address,
      owner: account
    }
  ) as any

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
