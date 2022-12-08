import BigNumber from "bignumber.js";

export const checkUnsignedBigNumber = (value: BigNumber): BigNumber => {
	if (value.lt(0))
		throw new Error("VM Exception while processing transaction: reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)");
	return value;
}

export const DISCRIMINDATOR = 'UNSIGNED-BIGNUMBER';
export interface UnsignedBigNumberType {
	discriminator: string;
	value: BigNumber;
	plus: (bigNumber: UnsignedBigNumberType | BigNumber | number | string, base?: number) => BigNumber;
	minus: (bigNumber: UnsignedBigNumberType | BigNumber | number | string, base?: number) => BigNumber;
	dividedBy: (bigNumber: UnsignedBigNumberType | BigNumber | number | string, base?: number) => BigNumber;
	multipliedBy: (bigNumber: UnsignedBigNumberType | BigNumber | number | string, base?: number) => BigNumber;
	times: (bigNumber: UnsignedBigNumberType | BigNumber | number | string, base?: number) => BigNumber;
	eq: (bigNumber: UnsignedBigNumberType | BigNumber | number | string, base?: number) => boolean;
	gt: (bigNumber: UnsignedBigNumberType| BigNumber | number | string, base?: number) => boolean;
	gte: (bigNumber: UnsignedBigNumberType | BigNumber | number | string, base?: number) => boolean;
	lt: (bigNumber: UnsignedBigNumberType | BigNumber | number | string, base?: number) => boolean;
	lte: (bigNumber: UnsignedBigNumberType | BigNumber | number | string, base?: number) => boolean;
	isNegative: () => boolean;
	isPositive: () => boolean;
	isZero: () => boolean;
}

export function instanceOfUnSignedBigNumber(data: any): data is UnsignedBigNumberType {
	return data.discriminator === DISCRIMINDATOR;
}

export const UnsignedBigNumber = (value: BigNumber | number | string, base = 10): UnsignedBigNumberType => {
	const obj = Object.create(null);
	obj._v = checkUnsignedBigNumber(BigNumber(value, base));
	obj.discriminator = DISCRIMINDATOR;

	Object.defineProperty(obj, "value", {
		set: function (value: BigNumber | number | string) {
			this._v = checkUnsignedBigNumber(BigNumber(value));
		},
		get: function () {
			return this._v;
		}
	});

	obj.plus = function (bigNumber: UnsignedBigNumberType | BigNumber | number | string, base = 10): BigNumber {
		console.log("HERE!", instanceOfUnSignedBigNumber(bigNumber));
		if (instanceOfUnSignedBigNumber(bigNumber)) 
			return this.value.plus(bigNumber.value, base);
		return this.value.plus(bigNumber, base);
	}

	obj.minus = function (bigNumber: BigNumber | number | string, base = 10): BigNumber {
		if (instanceOfUnSignedBigNumber(bigNumber)) 
			return this.value.minus(bigNumber.value, base);
		return this.value.minus(bigNumber, base);
	}

	obj.dividedBy = function (bigNumber: BigNumber | number | string, base = 10): BigNumber {
		if (instanceOfUnSignedBigNumber(bigNumber)) 
			return this.value.dividedBy(bigNumber.value, base);
		return this.value.dividedBy(bigNumber, base);
	}

	obj.multipliedBy = function (bigNumber: BigNumber | number | string, base = 10): BigNumber {
		if (instanceOfUnSignedBigNumber(bigNumber)) 
			return this.value.multipliedBy(bigNumber.value, base);
		return this.value.multipliedBy(bigNumber, base);
	}

	obj.times = function (bigNumber: BigNumber | number | string, base = 10): BigNumber {
		if (instanceOfUnSignedBigNumber(bigNumber)) 
			return this.value.times(bigNumber.value, base);
		return this.value.times(bigNumber, base);
	}

	obj.eq = function (bigNumber: BigNumber | number | string, base = 10): boolean {
		if (instanceOfUnSignedBigNumber(bigNumber)) 
			return this.value.eq(bigNumber.value, base);
		return this.value.eq(bigNumber, base);
	}

	obj.gt = function (bigNumber: BigNumber | number | string, base = 10): boolean {
		if (instanceOfUnSignedBigNumber(bigNumber)) 
			return this.value.gt(bigNumber.value, base);
		return this.value.gt(bigNumber, base);
	}

	obj.gte = function (bigNumber: BigNumber | number | string, base = 10): boolean {
		if (instanceOfUnSignedBigNumber(bigNumber)) 
			return this.value.gte(bigNumber.value, base);
		return this.value.gte(bigNumber, base);
	}

	obj.lt = function (bigNumber: BigNumber | number | string, base = 10): boolean {
		if (instanceOfUnSignedBigNumber(bigNumber)) 
			return this.value.lt(bigNumber.value, base);
		return this.value.lt(bigNumber, base);
	}

	obj.lte = function (bigNumber: BigNumber | number | string, base = 10): boolean {
		if (instanceOfUnSignedBigNumber(bigNumber)) 
			return this.value.lte(bigNumber.value, base);
		return this.value.lte(bigNumber, base);
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