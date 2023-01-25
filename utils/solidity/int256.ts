import BigNumber from "bignumber.js"
import uint256 from "./uint256"
import { isUint256 } from "./uint256"

export default int256

export declare interface int256 extends BigNumber {}

const BN = BigNumber.clone({ DECIMAL_PLACES: 0, ROUNDING_MODE: 1 })
export function int256(value: number | string | int256 | uint256, base = 10): BigNumber {
  if (typeof value === "number" || typeof value === "string") return BN(value, base)
  if (isUint256(value)) return BN(value.value, base)
  return BN(value, base)
}
