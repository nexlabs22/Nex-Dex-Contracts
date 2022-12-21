import BigNumber from "bignumber.js";
import int256 from './int256';
import {
	ATTR_TYPE,
	SOLIDITY_UINT256
} from '../constant';

export const checkUnsignedBigNumber = (value: BigNumber): BigNumber => {
	if (value.lt(0))
		throw new Error("VM Exception while processing transaction: reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)");
	return value;
}

export const DISCRIMINDATOR = 'UNSIGNED-BIGNUMBER';
export interface UnsignedBigNumberType {
	[ATTR_TYPE]: string;
	value: BigNumber;
	toFixed: (dp?: number, rm?: number) => string;
	plus: (bigNumber: UnsignedBigNumberType | number | string, base?: number) => UnsignedBigNumberType;
	minus: (bigNumber: UnsignedBigNumberType | number | string, base?: number) => UnsignedBigNumberType;
	dividedBy: (bigNumber: UnsignedBigNumberType | number | string, base?: number) => UnsignedBigNumberType;
	multipliedBy: (bigNumber: UnsignedBigNumberType | number | string, base?: number) => UnsignedBigNumberType;
	times: (bigNumber: UnsignedBigNumberType | number | string, base?: number) => UnsignedBigNumberType;
	eq: (bigNumber: UnsignedBigNumberType | number | string, base?: number) => boolean;
	gt: (bigNumber: UnsignedBigNumberType| BigNumber | number | string, base?: number) => boolean;
	gte: (bigNumber: UnsignedBigNumberType | number | string, base?: number) => boolean;
	lt: (bigNumber: UnsignedBigNumberType | number | string, base?: number) => boolean;
	lte: (bigNumber: UnsignedBigNumberType | number | string, base?: number) => boolean;
	isNegative: () => boolean;
	isPositive: () => boolean;
	isZero: () => boolean;
}

export function instanceOfUnSignedBigNumber(data: any): data is UnsignedBigNumberType {
	return data[ATTR_TYPE] === SOLIDITY_UINT256;
}

export const UnsignedBigNumber = (value: BigNumber | number | string, base = 10): UnsignedBigNumberType => {
	const helper = (func: any, args: Array<any>): BigNumber => {
		if (instanceOfUnSignedBigNumber(args[1])) 
			args[1] = args[1].value;
		return func.call(...args);
	}

	const obj = Object.create(null);
	obj._v = checkUnsignedBigNumber(int256(value, base));
	obj[ATTR_TYPE] = SOLIDITY_UINT256;

	Object.defineProperty(obj, "value", {
		set: function (value: BigNumber | number | string) {
			this._v = checkUnsignedBigNumber(int256(value));
		},
		get: function () {
			return this._v;
		}
	});

	obj.toFixed = function (dp = null, rm = 0): string {
		return this.value.toFixed(dp, rm);
	}

	obj._helper = function(funcPrototype: any, args: Array<any>): UnsignedBigNumberType {
		return UnsignedBigNumber(helper(funcPrototype, [this.value, ...args]));
	}

	obj.plus = function (bigNumber: UnsignedBigNumberType | number | string, base = 10): UnsignedBigNumberType {
		return this._helper(BigNumber.prototype.plus, [bigNumber, base]);
	}

	obj.minus = function (bigNumber: UnsignedBigNumberType | number | string, base = 10): UnsignedBigNumberType {
		return this._helper(BigNumber.prototype.minus, [bigNumber, base]);
	}

	obj.dividedBy = function (bigNumber: UnsignedBigNumberType | number | string, base = 10): UnsignedBigNumberType {
		return this._helper(BigNumber.prototype.dividedBy, [bigNumber, base]);
	}

	obj.multipliedBy = function (bigNumber: UnsignedBigNumberType | number | string, base = 10): UnsignedBigNumberType {
		return this._helper(BigNumber.prototype.multipliedBy, [bigNumber, base]);
	}

	obj.times = function (bigNumber: UnsignedBigNumberType | number | string, base = 10): UnsignedBigNumberType {
		return this._helper(BigNumber.prototype.times, [bigNumber, base]);
	}

	obj.eq = function (bigNumber: UnsignedBigNumberType | number | string, base = 10): boolean {
		return this._helper(BigNumber.prototype.eq, [bigNumber, base]);
	}

	obj.gt = function (bigNumber: UnsignedBigNumberType | number | string, base = 10): boolean {
		return this._helper(BigNumber.prototype.gt, [bigNumber, base]);
	}

	obj.gte = function (bigNumber: UnsignedBigNumberType | number | string, base = 10): boolean {
		return this._helper(BigNumber.prototype.gte, [bigNumber, base]);
	}

	obj.lt = function (bigNumber: UnsignedBigNumberType | number | string, base = 10): boolean {
		return this._helper(BigNumber.prototype.lt, [bigNumber, base]);
	}

	obj.lte = function (bigNumber: UnsignedBigNumberType | number | string, base = 10): boolean {
		return this._helper(BigNumber.prototype.lte, [bigNumber, base]);
	}

	obj.isNegative = function (): boolean {
		return this.value.isNegative();
	}

	obj.isPositive = function (): boolean {
		return this.value.isNegative();
	}

	obj.isZero = function (): boolean {
		return this.value.isZero();
	}

	return obj as UnsignedBigNumberType;
}

export default uint256;

export declare interface uint256 extends UnsignedBigNumberType {};

export function uint256(value: number | string | BigNumber): UnsignedBigNumberType {
  return UnsignedBigNumber(value);
}

export const isUint256 = instanceOfUnSignedBigNumber;