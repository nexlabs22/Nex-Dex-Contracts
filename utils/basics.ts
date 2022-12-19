import { ethers } from "hardhat";
import int256 from "./int256";

export const toBigNumber = (e: any): int256 => (int256(e.toString() as string).dividedBy(1e+18));
export const toEther = (e: any): number => Number(ethers.utils.formatEther(e));
export const toWei = (e: string) => ethers.utils.parseEther(e);
export const toWeiN = (e: number) => ethers.utils.parseEther(e + '');

export const compareResult = (contractValue: any, expectedValue: any, diff = 0): boolean => {
  if (int256(contractValue).minus(expectedValue).abs().gt(diff)) {
    console.log("Not equal! - ", int256(contractValue).toPrecision(), int256(expectedValue).toPrecision());
    return false;
  }
  return true;
}
export const Require = (condition: boolean, desc = ''): void => {
  if (!condition) throw new Error(desc);
}
