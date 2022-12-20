export default address;

export declare interface address extends String {};

export function address(value: number | string | any) {
  if (value === 0) return undefined;
  if (typeof value === 'string') return value;
  // TODO: address(this)
  return '';
}