import { ATTR_CONTRACT_ADDRESS } from "../constant"
import address from "./address"
import Contract from "./contract"

export default IERC20

export declare interface IERC20 extends Contract {}

export function IERC20(token: address): IERC20 {
  return {
    [ATTR_CONTRACT_ADDRESS]: token
  } as IERC20
}
