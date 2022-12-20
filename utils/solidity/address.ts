import { getContractAddress, isContract } from "./contract";

export default address;

export declare interface address extends String {};

export function address(value: number | string | any) {
  if (value === 0) return undefined;
  if (typeof value === 'string') return value;
  if (isContract(value)) return getContractAddress(value);
  return '';
}