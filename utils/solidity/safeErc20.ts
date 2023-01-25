import { ATTR_CONTRACT_TOKEN, ATTR_CONTRACT_ADDRESS } from "./../constant"
import { GetContractByAddress, GetCurrentContractAddress } from "../core/worker"
import address from "./address"
import IERC20 from "./ierc20"
import uint256 from "./uint256"

const SafeERC20 = {
  safeTransferFrom: function (
    token: IERC20,
    from: address | undefined,
    to: address | undefined,
    value: uint256
  ) {
    const sender = GetContractByAddress({
      address: from as string,
    })

    const receiver = GetContractByAddress({
      address: to as string,
    })

    const tokenAddress = token[ATTR_CONTRACT_ADDRESS]

    console.log(from);
    console.log(to);
    if (!sender || !receiver) {
      throw new Error("Sender or Receiver contract can not be null.")
    }

    if (
      !sender[ATTR_CONTRACT_TOKEN][tokenAddress] ||
      sender[ATTR_CONTRACT_TOKEN][tokenAddress].lt(value)
    ) {
      throw new Error("No enough token in sender contract")
    }

    if (!receiver[ATTR_CONTRACT_TOKEN][tokenAddress]) {
      receiver[ATTR_CONTRACT_TOKEN][tokenAddress] = uint256(0)
    }

    sender[ATTR_CONTRACT_TOKEN][tokenAddress] = sender[ATTR_CONTRACT_TOKEN][tokenAddress].minus(value)
    receiver[ATTR_CONTRACT_TOKEN][tokenAddress] = receiver[ATTR_CONTRACT_TOKEN][tokenAddress].plus(value)
  },

  safeTransfer: function (token: IERC20, to: address, value: uint256) {
    const sender = GetCurrentContractAddress()
    this.safeTransferFrom(token, sender, to, value)
  },
}

export default SafeERC20
