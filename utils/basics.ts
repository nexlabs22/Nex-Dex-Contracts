import { ethers } from "hardhat";
import BigNumber from "bignumber.js";

export const BN = BigNumber.clone({ DECIMAL_PLACES: 18, ROUNDING_MODE: 1 });
export const toBigNumber = (e: any): BigNumber => (BigNumber(e.toString() as string).dividedBy(1e+18));
export const toEther = (e: any): number => Number(ethers.utils.formatEther(e));
export const toWei = (e: string) => ethers.utils.parseEther(e);
export const toWeiN = (e: number) => ethers.utils.parseEther(e + '');

export const compareResult = (contractValue: any, expectedValue: any, diff = 0): boolean => {
  if (BigNumber(contractValue).minus(expectedValue).abs().gt(diff)) {
    console.log("Not equal! - ", BigNumber(contractValue).toPrecision(), BigNumber(expectedValue).toPrecision());
    return false;
  }
  return true;
}

export interface UnsignedIntType {
  value: number;
}

export const roundDecimal = (v: number | UnsignedIntType, place = 2): number => {
  const value = (typeof v === 'number') ? v : v.value;
  const X = 10 ** place;
  return Math.round((value + Number.EPSILON) * X) / X;
}

export const checkUnsignedInt = (value: number): number => {
  if (value < 0)
    throw new Error("VM Exception while processing transaction: reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)");
  return value;
}

export const UnsignedInt = (value: number): UnsignedIntType => {
  const obj = Object.create(null);
  obj._v = checkUnsignedInt(value);

  Object.defineProperty(obj, "value", {
    set: function(value: number) {
      this._v = checkUnsignedInt(value);
    },
    get: function() {
      return this._v;
    }
  });

  return obj;
}
