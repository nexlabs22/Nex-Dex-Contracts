import { ethers } from "hardhat";
import int256 from "./int256";
import { BigNumber as EtherBigNumber } from "ethers";
import uint256, { isUint256 } from "./uint256";
import BigNumber from "bignumber.js";

export const toBigNumber = (e: EtherBigNumber): int256 => (int256(e.toString() as string));
export const toEtherBigNumber = (e: any): EtherBigNumber => ethers.utils.parseEther(int256(e).dividedBy(1e+18).toString());
export const toEther = (e: any): number => Number(ethers.utils.formatEther(e));
export const toWei = (e: string) => ethers.utils.parseEther(e);
export const toWeiN = (e: number) => ethers.utils.parseEther(e + '');
export const toWeiBigNumber = (e: any): int256 => int256(e).multipliedBy(1e+18);

export const compareResult = (contractValue: any, expectedValue: any, diff = 0): boolean => {
  if (int256(contractValue).minus(int256(expectedValue)).abs().gt(diff)) {
    console.log("Not equal! - ", int256(contractValue).toPrecision(), int256(expectedValue).toPrecision());
    return false;
  }
  return true;
}
export const Require = (condition: boolean, desc = ''): void => {
  if (!condition) throw new Error(desc);
}

export const toNumber = (v: int256 | uint256, places = 2): number => {
  return +BigNumber(isUint256(v) ? v.value : v).dividedBy(1e18).toFixed(places, 1);
}