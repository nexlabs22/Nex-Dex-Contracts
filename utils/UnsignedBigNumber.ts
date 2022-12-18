import BigNumber from "bignumber.js";
import { BN } from './basics';

export const checkUnsignedBigNumber = (value: BigNumber): BigNumber => {
	if (value.lt(0))
		throw new Error("VM Exception while processing transaction: reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)");
	return value;
}

export const DISCRIMINDATOR = 'UNSIGNED-BIGNUMBER';
export interface UnsignedBigNumberType {
	discriminator: string;
	value: BigNumber;
	toFixed: (dp?: number, rm?: number) => string;
}

export function instanceOfUnSignedBigNumber(data: any): data is UnsignedBigNumberType {
	return data.discriminator === DISCRIMINDATOR;
}

export const UnsignedBigNumber = (value: BigNumber | number | string, base = 10): UnsignedBigNumberType => {
	const obj = Object.create(null);
	obj._v = checkUnsignedBigNumber(BN(value, base));
	obj.discriminator = DISCRIMINDATOR;

	Object.defineProperty(obj, "value", {
		set: function (value: BigNumber | number | string) {
			this._v = checkUnsignedBigNumber(BN(value));
		},
		get: function () {
			return this._v;
		}
	});

	obj.toFixed = function (dp = null, rm = 0): string {
		return this.value.toFixed(dp, rm);
	}

	return obj as UnsignedBigNumberType;
}
