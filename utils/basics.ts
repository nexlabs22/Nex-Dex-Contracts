import { ethers } from "hardhat"

export const toEther = (e: any) => Number(ethers.utils.formatEther(e));
export const toWei = (e: string) => ethers.utils.parseEther(e);
export const toWeiN = (e: number) => ethers.utils.parseEther(e + '');

export const compareResult = (contractValue: any, expectedValue: number, diff = 0.0000000001): boolean => {
  if (Math.abs(Number(contractValue) - expectedValue) > diff) {
    console.log("Not equal! - ", Number(contractValue), expectedValue);
    return false;
  }
  return true;
}

export const roundDecimal = (value: number, place = 2): number => {
  const X = 10 ** place;
  return Math.round((value + Number.EPSILON) * X) / X;
}