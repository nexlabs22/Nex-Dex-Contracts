import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import BigNumber from "bignumber.js";
import { compareResult, roundDecimal } from "./basics";
import { UnsignedBigNumber } from "./UnsignedBigNumber";

import type { UnsignedBigNumberType } from "./UnsignedBigNumber";

export interface User {
  account: SignerWithAddress;
  vUsdBalance: BigNumber;
  vBaycBalance: BigNumber;
  collateral: BigNumber;
}

export interface UserStatus extends User {
  margin: BigNumber;
  notionalValue: BigNumber;
  accountValue: BigNumber;
  pnl: BigNumber;
}

export interface PoolType {
  vBaycPoolSize: UnsignedBigNumberType;
  vUsdPoolSize: UnsignedBigNumberType;
}

export interface VirtualBalance {
  virtualCollateral: BigNumber;
  uservUsdBalance: BigNumber;
  uservBaycBalance: BigNumber;
}

export interface LogType {
  from: number;
  to: number;
  amount: BigNumber;
  desc?: string;
}

export const SWAP_FEE = 10 / 10000;
export const DISCOUNT_RATE = 0.2;
export const SAFE_MARGIN = 0.6;
export const MAINTENANCE_MARGIN = 0.5;
export const ATUO_CLOSE_MARGIN = 0.4;

export function organizeTestPool(price: BigNumber, poolsize: BigNumber, exchangeContract: any, usdcContract: any) {
  const Pool = Object.create(null);

  Pool.vBaycPoolSize = UnsignedBigNumber(poolsize);
  Pool.vUsdPoolSize = UnsignedBigNumber(price.multipliedBy(poolsize));

  Pool.userInitCollateral = [] as Array<UnsignedBigNumberType>;
  Pool.collateral = [] as Array<UnsignedBigNumberType>;
  Pool.virtualBalances = [] as Array<VirtualBalance>;
  Pool.userAccounts = [] as Array<SignerWithAddress>;
  Pool.userCount = 0;
  Pool.logs = [] as Array<LogType>;

  Pool.virtualCollateral = BigNumber(0);
  Pool.realCollateral = UnsignedBigNumber(0);
  Pool.insuranceFunds = UnsignedBigNumber(0);
  Pool.feeCollector = UnsignedBigNumber(0);

  Pool.exchangeContract = exchangeContract;
  Pool.usdcContract = usdcContract;

  Object.defineProperty(Pool, 'price', {
    get: function () {
      return this.vUsdPoolSize.value.dividedBy(this.vBaycPoolSize.value);
    }
  });

  Object.defineProperty(Pool, 'poolState', {
    get: function (): PoolType {
      return {
        vBaycPoolSize: this.vBaycPoolSize,
        vUsdPoolSize: this.vUsdPoolSize,
      }
    },
    set: function ({ vBaycPoolSize, vUsdPoolSize }: PoolType): void {
      this.vBaycPoolSize = UnsignedBigNumber(vBaycPoolSize.value);
      this.vUsdPoolSize = UnsignedBigNumber(vUsdPoolSize.value);
    }
  });

  Pool.addUser = function (address: SignerWithAddress, collateral: BigNumber) {
    this.userCount++;
    this.userAccounts.push(address);
    this.collateral.push(UnsignedBigNumber(0));
    this.userInitCollateral.push(UnsignedBigNumber(collateral));
    this.virtualBalances.push({
      virtualCollateral: BigNumber(0),
      uservUsdBalance: BigNumber(0),
      uservBaycBalance: BigNumber(0),
    });
    this.depositCollateral(this.userCount - 1, UnsignedBigNumber(collateral));
  };

  Pool.userDetail = function () {
    return this.userAccounts.map((_: SignerWithAddress, i: number) => ({
      account: this.userAccounts[i],
      vUsdBalance: this.virtualBalances[i].uservUsdBalance,
      vBaycBalance: this.virtualBalances[i].uservBaycBalance,
      collateral: this.collateral[i].value
    }))
  }

  Pool.account = function (userId: number): SignerWithAddress | null {
    if (userId >= this.userCount) return null;

    return this.userAccounts[userId];
  }

  Pool.getUserCollateral = function (userId: number): BigNumber {
    if (userId >= this.userCount) return BigNumber(0);

    return this.collateral[userId].value;
  }

  Pool.getUservUsdBalance = function (userId: number): BigNumber {
    if (userId >= this.userCount) return BigNumber(0);

    return this.virtualBalances[userId].uservUsdBalance;
  }
    
  Pool.getUservBaycBalance = function (userId: number): BigNumber {
    if (userId >= this.userCount) return BigNumber(0);

    return this.virtualBalances[userId].uservBaycBalance;
  }

  Pool.addVusdBalance = function (usdAmount: BigNumber, poolState: PoolType | undefined): PoolType {
    const state: PoolType = poolState || this.poolState;
    const k = state.vBaycPoolSize.value.multipliedBy(state.vUsdPoolSize.value);
    const newvUsdPoolSize = state.vUsdPoolSize.value.plus(usdAmount);
    const newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);

    return {
      vBaycPoolSize: UnsignedBigNumber(newvBaycPoolSize),
      vUsdPoolSize: UnsignedBigNumber(newvUsdPoolSize),
    }
  }

  Pool.removeVusdBalance = function (usdAmount: BigNumber, poolState: PoolType | undefined): PoolType {
    return this.addVusdBalance(usdAmount.negated(), poolState);
  }

  Pool.addBaycBalance = function (baycAmount: BigNumber, poolState: PoolType | undefined): PoolType {
    const state: PoolType = poolState || this.poolState;
    const k = state.vBaycPoolSize.value.multipliedBy(state.vUsdPoolSize.value);
    const newvBaycPoolSize = state.vBaycPoolSize.value.plus(baycAmount);
    const newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);

    return {
      vBaycPoolSize: UnsignedBigNumber(newvBaycPoolSize),
      vUsdPoolSize: UnsignedBigNumber(newvUsdPoolSize),
    }
  }

  Pool.removeBaycBalance = function (baycAmount: BigNumber, poolState: PoolType | undefined): PoolType {
    return this.addBaycBalance(baycAmount.negated(), poolState);
  }

  Pool.updateUserBalance = function (userId: number, vBaycSize: BigNumber, vUsdSize: BigNumber | number): void {
    if (userId >= this.userCount) return;

    this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.plus(vUsdSize);
    this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.plus(vBaycSize);
  }

  Pool.depositCollateral = function (userId: number, amount: UnsignedBigNumberType, desc = 'deposit') {
    if (userId >= this.userCount) return;
    
    this.collateral[userId] = UnsignedBigNumber(this.collateral[userId].value.plus(amount.value));
    this.realCollateral = UnsignedBigNumber(this.realCollateral.value.plus(amount.value));
    this.virtualCollateral = this.virtualCollateral.plus(amount.value);
  }

  Pool.withdrawCollateral = function (userId: number, amount: UnsignedBigNumberType, desc = 'withdraw') {
    if (userId >= this.userCount) return;
    
    this.collateral[userId] = UnsignedBigNumber(this.collateral[userId].value.minus(amount.value));
    this.realCollateral = UnsignedBigNumber(this.realCollateral.value.minus(amount.value));
    this.virtualCollateral = this.virtualCollateral.minus(amount.value);
  }

  Pool.withdrawCollateralByFee = function (userId: number, amount: UnsignedBigNumberType, desc = 'fee') {
    if (userId >= this.userCount) return;
    
    this.feeCollector = UnsignedBigNumber(this.feeCollector.value.plus(amount.value));
    this.collateral[userId] = UnsignedBigNumber(this.collateral[userId].value.minus(amount.value));
    this.realCollateral = UnsignedBigNumber(this.realCollateral.value.minus(amount.value));
    this.virtualCollateral = this.virtualCollateral.minus(amount.value);
  }

  Pool.withdrawCollateralByInsuranceFund = function (userId: number, amount: UnsignedBigNumberType, desc = 'insurance fund') {
    if (userId >= this.userCount) return;
    
    this.insuranceFunds = UnsignedBigNumber(this.insuranceFunds.value.plus(amount.value));
    this.collateral[userId] = UnsignedBigNumber(this.collateral[userId].value.minus(amount.value));
    this.virtualCollateral = this.virtualCollateral.minus(amount.value);
  }


  Pool.addUserCollateral = function (userId: number, amount: UnsignedBigNumberType, desc = '') {
    if (userId >= this.userCount) return;

    this.collateral[userId] = UnsignedBigNumber(this.collateral[userId].value.plus(amount.value));
    this.virtualCollateral = this.virtualCollateral.minus(amount.value);

    this.logs.push({
      from: -1,   // contract
      to: userId,
      amount: amount.value.negated(),
      desc
    });
  }

  Pool.reduceUserCollateral = function (userId: number, amount: UnsignedBigNumberType, desc = '') {
    if (userId >= this.userCount) return;

    this.collateral[userId] = UnsignedBigNumber(this.collateral[userId].value.minus(amount.value));
    this.virtualCollateral = this.virtualCollateral.plus(amount.value);

    this.logs.push({
      from: userId,
      to: -1,   // contract
      amount: amount.value,
      desc
    });
  }

  Pool.getLongBaycAmountOut = function (_vUsdAmount: BigNumber, poolState: PoolType | undefined): BigNumber {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value.multipliedBy(vBaycPoolSize.value);
    return vBaycPoolSize.value.minus(K.dividedBy(vUsdPoolSize.value.plus(_vUsdAmount)));
  }

  Pool.getLongVusdAmountOut = function (_vBaycAmount: BigNumber, poolState: PoolType | undefined): BigNumber {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value.multipliedBy(vBaycPoolSize.value);
    return K.dividedBy(vBaycPoolSize.value.minus(_vBaycAmount)).minus(vUsdPoolSize.value);
  }

  Pool.getShortBaycAmountOut = function (_vUsdAmount: BigNumber, poolState: PoolType | undefined): BigNumber {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value.multipliedBy(vBaycPoolSize.value);
    return K.dividedBy(vUsdPoolSize.value.minus(_vUsdAmount)).minus(vBaycPoolSize.value);
  }

  Pool.getShortVusdAmountOut = function (_vBaycAmount: BigNumber, poolState: PoolType | undefined): BigNumber {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value.multipliedBy(vBaycPoolSize.value);
    return vUsdPoolSize.value.minus(K.dividedBy(vBaycPoolSize.value.plus(_vBaycAmount)));
  }

  Pool.getVusdAmountOut = function (baycAmount: BigNumber, poolState: PoolType): BigNumber {
    if (baycAmount.gt(0))      return this.getShortVusdAmountOut(baycAmount, poolState);
    else if (baycAmount.lt(0)) return this.getLongVusdAmountOut(baycAmount.abs(), poolState);
    return BigNumber(0);
  }

  Pool.getNotionalValue = function (userId: number, poolState: PoolType): BigNumber {
    if (userId >= this.userCount) return BigNumber(0);

    const baycBalance = this.virtualBalances[userId].uservBaycBalance;
    
    return this.getVusdAmountOut(baycBalance, poolState);
  }

  Pool.getPNL = function (userId: number, poolState: PoolType): BigNumber {
    if (userId >= this.userCount) return BigNumber(0);

    const notionalValue = this.getNotionalValue(userId, poolState);
    const usdBalance = this.virtualBalances[userId].uservUsdBalance;
    const baycBalance = this.virtualBalances[userId].uservBaycBalance;

    let pnl = BigNumber(0);
    if (baycBalance.gt(0))      pnl = notionalValue.plus(usdBalance);
    else if (baycBalance.lt(0)) pnl = usdBalance.minus(notionalValue);

    return pnl;
  }

  Pool.getAccountValue = function (userId: number, poolState: PoolType): BigNumber {
    if (userId >= this.userCount) return BigNumber(0);

    const pnl = this.getPNL(userId, poolState);
    const baycBalance = this.virtualBalances[userId].uservBaycBalance;
    const collateral = this.collateral[userId].value;

    let accountValue = BigNumber(collateral);
    // TODO: add virtual collateral
    if (! baycBalance.eq(0)) accountValue = collateral.plus(pnl);

    return accountValue;
  }

  Pool.getMargin = function (userId: number, poolState: PoolType): BigNumber {
    if (userId >= this.userCount) return BigNumber(0);

    const accountValue = this.getAccountValue(userId, poolState);
    const notionalValue = this.getNotionalValue(userId, poolState);
    const baycBalance = this.virtualBalances[userId].uservBaycBalance;

    let margin = BigNumber(0);
    if (baycBalance != 0) margin = accountValue.dividedBy(notionalValue).multipliedBy(100.0);

    return margin;
  }

  Pool.getUserStatus = function (userId: number, poolState: PoolType) {
    if (userId >= this.userCount) return;

    const collateral        = this.collateral[userId].value;
    const usdBalance        = this.virtualBalances[userId].uservUsdBalance;
    const baycBalance       = this.virtualBalances[userId].uservBaycBalance;
    const notionalValue     = this.getNotionalValue(userId, poolState);
    const pnl               = this.getPNL(userId, poolState);
    const accountValue      = this.getAccountValue(userId, poolState);
    const margin            = this.getMargin(userId, poolState);

    return {
      userId,
      account: this.userAccounts[userId],
      vUsdBalance: usdBalance,
      vBaycBalance: baycBalance,
      collateral,

      notionalValue,
      pnl,
      accountValue,
      margin,
    }
  }

  Pool.isNewMarginLiquidatable = function(userId: number, _usdAmount: BigNumber, poolState: PoolType): boolean {
    const accountValue = this.getAccountValue(userId, poolState);
    const positionNotional = UnsignedBigNumber(this.getNotionalValue(userId, poolState));
    const newPositionNotional = UnsignedBigNumber(positionNotional.value.plus(_usdAmount));
    const newMargin = accountValue.dividedBy(newPositionNotional.value).multipliedBy(100);
    
    if (!newMargin.eq(0) && newMargin.lte(SAFE_MARGIN)) {
      return true;
    } else {
      return false;
    }
  }

  Pool.isPartialLiquidatable = function (userId: number, poolState: PoolType): boolean {
    if (userId >= this.userCount) return false;
    const margin = Number(this.getMargin(userId, poolState).toFixed(0, 1)) / 100;

    if (ATUO_CLOSE_MARGIN <= margin && margin <= MAINTENANCE_MARGIN) return true;
    return false;
  }

  Pool.isHardLiquidatable = function (userId: number, poolState: PoolType): boolean {
    if (userId >= this.userCount) return false;
    const margin = Number(this.getMargin(userId, poolState).toFixed(0, 1)) / 100;

    if (margin != 0 && margin <= ATUO_CLOSE_MARGIN) return true;
    return false;
  }

  Pool.calculatePartialLiquidateValue = function(userId: number, poolState: PoolType): BigNumber {
    const accountValue = this.getAccountValue(userId, poolState);
    const notionalValue = this.getNotionalValue(userId, poolState);
    const numerator = notionalValue.multipliedBy(SAFE_MARGIN).minus(accountValue.abs());
    const denominator = SAFE_MARGIN - DISCOUNT_RATE;
    const x = numerator.dividedBy(denominator);
    return x;
  }

  Pool.partialLiquidate = function (userId: number, poolState: PoolType): PoolType {
    let vBaycNewPoolSize = poolState.vBaycPoolSize;
    let vUsdNewPoolSize = poolState.vUsdPoolSize;

    const liquidateAmount = this.calculatePartialLiquidateValue(userId, poolState);
    const baycLiquidateAmount = liquidateAmount.multipliedBy(this.vBaycPoolSize.value).dividedBy(this.vUsdPoolSize.value);

    const userUsdBalance = this.virtualBalances[userId].uservUsdBalance;
    const userBaycBalance = this.virtualBalances[userId].uservBaycBalance;
    if (userBaycBalance.gt(0)) {
      const usdBaycValue = this.getShortVusdAmountOut(baycLiquidateAmount);
      const userPartialvUsdBalance = userUsdBalance.multipliedBy(baycLiquidateAmount).dividedBy(userBaycBalance);

      if (usdBaycValue.gt(userPartialvUsdBalance.abs())) {
        const pnl = usdBaycValue.minus(userPartialvUsdBalance.abs());
        this.addUserCollateral(userId, UnsignedBigNumber(pnl), 'trading profit');
      } else if (usdBaycValue.lt(userPartialvUsdBalance.abs())) {
        const pnl = userPartialvUsdBalance.abs().minus(usdBaycValue);
        this.reduceUserCollateral(userId, UnsignedBigNumber(pnl), 'trading loss');
      }

      // TODO: realize funding reward of user      
      this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.minus(baycLiquidateAmount);
      this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.plus(userPartialvUsdBalance.abs());

      // TODO: remove user
      const K = this.vBaycPoolSize.value.multipliedBy(this.vUsdPoolSize.value);
      this.vBaycPoolSize.value = this.vBaycPoolSize.value.plus(baycLiquidateAmount);
      this.vUsdPoolSize.value = K.dividedBy(this.vBaycPoolSize.value);

      vBaycNewPoolSize.value = vBaycNewPoolSize.value.plus(baycLiquidateAmount);
      vUsdNewPoolSize.value = K.dividedBy(vBaycNewPoolSize.value);
    }
    else if (userBaycBalance < 0) {
      const usdBaycValue = this.getLongVusdAmountOut(baycLiquidateAmount);
      const userPartialvUsdBalance = userUsdBalance.multipliedBy(baycLiquidateAmount).dividedBy(userBaycBalance);
      
      if (usdBaycValue.gt(userPartialvUsdBalance.abs())) {
        const pnl = usdBaycValue.minus(userPartialvUsdBalance.abs());
        this.reduceUserCollateral(userId, UnsignedBigNumber(pnl), 'trading loss');
      }
      if (usdBaycValue < Math.abs(userPartialvUsdBalance)) {
        const pnl = userPartialvUsdBalance.abs().minus(usdBaycValue);
        this.addUserCollateral(userId, UnsignedBigNumber(pnl), 'trading profit');
      }
      
      // TODO: realize funding reward of user
      this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.plus(baycLiquidateAmount);
      this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.minus(userPartialvUsdBalance.abs());

      // TODO: remove user
      const K = this.vBaycPoolSize.value.multipliedBy(this.vUsdPoolSize.value);
      this.vBaycPoolSize.value = this.vBaycPoolSize.value.minus(baycLiquidateAmount);
      this.vUsdPoolSize.value = K.dividedBy(this.vBaycPoolSize.value);

      vBaycNewPoolSize.value = vBaycNewPoolSize.value.minus(baycLiquidateAmount);
      vUsdNewPoolSize.value = K.dividedBy(vBaycNewPoolSize.value);
    }
    const discountAmount = UnsignedBigNumber(liquidateAmount.multipliedBy(DISCOUNT_RATE));
    this.withdrawCollateralByInsuranceFund(userId, discountAmount);

    return {
      vBaycPoolSize: vBaycNewPoolSize,
      vUsdPoolSize: vUsdNewPoolSize,
    }
  }

  Pool.partialLiquidateUsers = function (poolState: PoolType): PoolType {
    let newPoolState = poolState;
    for (let i = 0; i < this.userCount; i++) {
      const isLiquidatable = this.isPartialLiquidatable(i, poolState);
      if (isLiquidatable) {
        newPoolState = this.partialLiquidate(i, newPoolState);
      }
    }
    return newPoolState;
  }

  Pool.hardLiquidate = function (userId: number, poolState: PoolType): PoolType {
    let vBaycNewPoolSize = poolState.vBaycPoolSize;
    let vUsdNewPoolSize = poolState.vUsdPoolSize;

    const userUsdBalance = this.virtualBalances[userId].uservUsdBalance;
    const userBaycBalance = this.virtualBalances[userId].uservBaycBalance;
    if (userBaycBalance.gt(0)) {
      const usdBaycValue = this.getShortVusdAmountOut(userBaycBalance);

      if (usdBaycValue.gt(userUsdBalance.abs())) {
        const pnl = usdBaycValue.minus(userUsdBalance.abs());
        this.addUserCollateral(userId, UnsignedBigNumber(pnl), 'trading profit');
      } else if (usdBaycValue < Math.abs(userUsdBalance)) {
        const pnl = userUsdBalance.abs().minus(usdBaycValue);
        this.reduceUserCollateral(userId, UnsignedBigNumber(pnl), 'trading loss');
      }

      // TODO: realize funding reward of user
      this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.minus(userBaycBalance);
      this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.minus(userUsdBalance);

      // TODO: remove user
      const K = this.vBaycPoolSize.value.multipliedBy(this.vUsdPoolSize.value);
      this.vBaycPoolSize.value = this.vBaycPoolSize.value.plus(userBaycBalance);
      this.vUsdPoolSize.value = K.dividedBy(this.vBaycPoolSize.value);

      vBaycNewPoolSize.value = vBaycNewPoolSize.value.plus(userBaycBalance);
      vUsdNewPoolSize.value = K.dividedBy(vBaycNewPoolSize.value);
    }
    else if (userBaycBalance.lt(0)) {
      const _assetSize = userBaycBalance.abs();
      const usdBaycValue = this.getLongVusdAmountOut(_assetSize);

      if (usdBaycValue.gt(userUsdBalance)) {
        const pnl = usdBaycValue.minus(userUsdBalance);
        this.reduceUserCollateral(userId, UnsignedBigNumber(pnl), 'trading loss');
      } else if (usdBaycValue.lt(Math.abs(userUsdBalance))) {
        const pnl = userUsdBalance.minus(usdBaycValue);
        this.addUserCollateral(userId, UnsignedBigNumber(pnl), 'trading profit');
      }

      // TODO: realize funding reward of user
      this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.minus(userBaycBalance);
      this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.minus(userUsdBalance);

      // TODO: remove user
      const K = this.vBaycPoolSize.value.multipliedBy(this.vUsdPoolSize.value);
      this.vBaycPoolSize.value = this.vBaycPoolSize.value.plus(userBaycBalance);
      this.vUsdPoolSize.value = K.dividedBy(this.vBaycPoolSize.value);

      vBaycNewPoolSize.value = vBaycNewPoolSize.value.plus(userBaycBalance);
      vUsdNewPoolSize.value = K.dividedBy(vBaycNewPoolSize.value);
    }
    const discountAmount = UnsignedBigNumber(this.collateral[userId].value.multipliedBy(DISCOUNT_RATE));
    this.withdrawCollateralByInsuranceFund(userId, discountAmount);

    return {
      vBaycPoolSize: vBaycNewPoolSize,
      vUsdPoolSize: vUsdNewPoolSize,
    }
  }

  Pool.hardNegativeLiquidate = function(userId: number, poolState: PoolType): void {

  }

  Pool.hardLiquidateUsers = function (poolState: PoolType): PoolType {
    let newPoolState = poolState;
    for (let i = 0; i < this.userCount; i++) {
      const isLiquidatable = this.isHardLiquidatable(i, poolState);
      if (isLiquidatable) {
        const userMargin = this.getMargin(i, poolState);
        if (userMargin > 0) {
          newPoolState = this.hardLiquidate(i, newPoolState);
        } else if (userMargin < 0) {
          newPoolState = this.hardNegativeLiquidate(i, newPoolState);
        }
      }
    }
    return newPoolState;
  }

  Pool.openLongPosition = function (userId: number, _usdAmount: BigNumber) {
    let newPoolState = this.addVusdBalance(_usdAmount);

    const isNewMarginHardLiquidatable = this.isNewMarginLiquidatable(userId, _usdAmount, newPoolState);
    if (isNewMarginHardLiquidatable) {
      throw new Error("Insufficient margin to open position with requested size.");
    }

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);
    newPoolState = this.addVusdBalance(_usdAmount);

    const userBayc = UnsignedBigNumber(this.vBaycPoolSize.value.minus(newPoolState.vBaycPoolSize.value));
    this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.plus(userBayc.value);
    this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.minus(_usdAmount);

    // TODO: add active user
    
    const fee = UnsignedBigNumber(_usdAmount.multipliedBy(SWAP_FEE));
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = newPoolState;
  }

  Pool.openShortPosition = function (userId: number, _usdAmount: BigNumber) {
    let newPoolState = this.removeVusdBalance(_usdAmount);

    const isNewMarginHardLiquidatable = this.isNewMarginLiquidatable(userId, _usdAmount, newPoolState);
    if (isNewMarginHardLiquidatable) {
      throw new Error("Insufficient margin to open position with requested size.");
    }

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);
    newPoolState = this.removeVusdBalance(_usdAmount);

    const userBayc = UnsignedBigNumber(newPoolState.vBaycPoolSize.value.minus(this.vBaycPoolSize.value));
    this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.minus(userBayc.value);
    this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.plus(_usdAmount);

    // TODO: add active user
    
    const fee = UnsignedBigNumber(_usdAmount.multipliedBy(SWAP_FEE));
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = newPoolState;
  }

  Pool.closePositionComplete = function (userId: number) {
    const assetSize = this.virtualBalances[userId].uservBaycBalance.abs();
    this.closePosition(userId, assetSize);
  }

  Pool.closePosition = function (userId: number, _assetSize: BigNumber) {
    if (_assetSize.gt(this.virtualBalances[userId].uservBaycBalance.abs())) {
      throw new Error("Reduce only order can only close size equal or less than the outstanding asset size.");
    }

    if (this.virtualBalances[userId].uservBaycBalance.gt(0)) {
      this.closeLongPosition(userId, _assetSize);
    } else if (this.virtualBalances[userId].uservBaycBalance.lt(0)) {
      this.closeShortPosition(userId, _assetSize);
    }
  }

  Pool.closeLongPosition = function (userId: number, _assetSize: BigNumber) {
    if (_assetSize.gt(this.virtualBalances[userId].uservBaycBalance.abs())) {
      throw new Error("Reduce only order can only close long size equal or less than the outstanding asset size.");
    }

    let newPoolState = this.addBaycBalance(_assetSize);

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);

    const usdBaycValue = UnsignedBigNumber(this.getShortVusdAmountOut(_assetSize)).value;

    const userPartialvUsdBalance = this.virtualBalances[userId].uservUsdBalance.multipliedBy(_assetSize)
        .dividedBy(this.virtualBalances[userId].uservBaycBalance);
    
    if (usdBaycValue.gt(userPartialvUsdBalance.abs())) {
      const pnl = UnsignedBigNumber(usdBaycValue.minus(userPartialvUsdBalance.abs()));
      this.addUserCollateral(userId, pnl, 'trading profit');
    } else if (usdBaycValue.lt(userPartialvUsdBalance.abs())) {
      const pnl = UnsignedBigNumber(userPartialvUsdBalance.abs().minus(usdBaycValue));
      this.reduceUserCollateral(userId, pnl, 'trading loss');
    }

    // TODO: add virtual collateral

    this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.minus(_assetSize);
    this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.plus(userPartialvUsdBalance.abs());

    const fee = UnsignedBigNumber(usdBaycValue.multipliedBy(SWAP_FEE));
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = this.addBaycBalance(_assetSize);
  }

  Pool.closeShortPosition = function (userId: number, _assetSize: BigNumber) {
    if (_assetSize.gt(this.virtualBalances[userId].uservBaycBalance.abs())) {
      throw new Error("Reduce only order can only close long size equal or less than the outstanding asset size.");
    }

    let newPoolState = this.removeBaycBalance(_assetSize);

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);

    const usdBaycValue = UnsignedBigNumber(this.getLongVusdAmountOut(_assetSize)).value;

    const userPartialvUsdBalance = this.virtualBalances[userId].uservUsdBalance.multipliedBy(_assetSize)
      .dividedBy(this.virtualBalances[userId].uservBaycBalance);
    
    if (usdBaycValue.gt(userPartialvUsdBalance.abs())) {
      const pnl = UnsignedBigNumber(usdBaycValue.minus(userPartialvUsdBalance.abs()));
      this.reduceUserCollateral(userId, pnl, 'trading loss');
    } else if (usdBaycValue.lt(userPartialvUsdBalance.abs())) {
      const pnl = UnsignedBigNumber(userPartialvUsdBalance.abs().minus(usdBaycValue));
      this.addUserCollateral(userId, pnl, 'trading profit');
    }

    // TODO: add virtual collateral

    this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.plus(_assetSize);
    this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.minus(userPartialvUsdBalance.abs());

    const fee = UnsignedBigNumber(usdBaycValue.multipliedBy(SWAP_FEE));
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = this.removeBaycBalance(_assetSize);
  }

  // Pool.collateralCheck = function () {
  //   for (let i = 0; i < this.userCount; i++) {
  //     let temp = this.userInitCollateral[i].value;
  //     this.logs.filter((log: LogType) => log.from === i || log.to === i)
  //             .forEach((log: LogType) => temp = log.from === i ? temp - log.amount : temp + log.amount);
  //     if (! compareResult(temp, this.collateral[i].value)) return false;
  //   }

  //   const init = this.userInitCollateral.map((v: UnsignedBigNumberType) => v.value).reduce((a: number, b: number) => a + b, 0);
  //   const last = this.collateral.reduce((a: UnsignedBigNumberType, b: UnsignedBigNumberType) => a.value + b.value, 0) + this.virtualCollateral;

  //   return compareResult(init, last);
  // }


  /*
  *  Test Report Form
  *
  *  User0: 300(init) - 0.49(position fee) + 0.8785093576642566(trading profit) - 17.7134043238507(discount fee) - 85.01204856066568(trading loss) - 39.53261129462958(discount fee) = 158.1304451785183
  *  User1: 5000(init) - 4.5(position fee) = 4995.5
  *  User2: 5000(init) - 7.5(position fee) = 4992.5
  *  Contract: 0 + 0.49(position fee) - 0.8785093576642566(trading profit) + 17.7134043238507(discount fee) + 4.5(position fee) + 85.01204856066568(trading loss) + 39.53261129462958(discount fee) + 7.5(position fee) = 153.8695548214817
  *  300 + 5000 + 5000 = 10300
  *  158.1304451785183 + 4995.5 + 4992.5 + 153.8695548214817 = 10300 
  */
  // Pool.testReport = function () {
  //   let report = "";
  //   for (let i = 0; i < this.userCount; i++) {
  //     report += `User${i}: `;
  //     report += this.userInitCollateral[i].value + '(init)';
  //     report += this.logs.filter((log: LogType) => log.from === i || log.to === i)
  //             .map((v: LogType) => ` ${v.from == i ? '-' : '+'} ${v.amount}${v.desc ? `(${v.desc})` : ''}`)
  //             .join('');
  //     report += ' = ' + this.collateral[i].value;
  //     report += '\n';
  //   }

  //   report += 'Contract: 0';
  //   report += this.logs.filter((log: LogType) => log.from === -1 || log.to === -1)
  //           .map((v: LogType) => ` ${v.from == -1 ? '-' : '+'} ${v.amount}${v.desc ? `(${v.desc})` : ''}`)
  //           .join('');
  //   report += ' = ' + this.virtualCollateral;
  //   report += '\n';

  //   report += `${this.userInitCollateral.map((v: UnsignedBigNumberType) => v.value).join(' + ')} = ${this.userInitCollateral.reduce((a: number, b: UnsignedBigNumberType) => a + b.value, 0)}\n`;
  //   report += `${this.collateral.map((v: UnsignedBigNumberType) => v.value).join(' + ')} + ${this.virtualCollateral} = ${this.collateral.reduce((a: number, b: UnsignedBigNumberType) => a + b.value, 0) + this.virtualCollateral}\n`;

  //   return report;
  // }

  Pool.printCurrentStatus = function() {
    const result = [];
    for (let i = 0; i < this.userCount; i++) {
      const status = this.getUserStatus(i, this.poolState);
      result.push({
        Id: 'User' + i,
        Collateral: +status.collateral.toFixed(2),
        AccountValue: +status.accountValue.toFixed(2),
        NotionalValue: +status.notionalValue.toFixed(2),
        PNL: +status.pnl.toFixed(2),
        Margin: +status.margin.toFixed(2),
        VirtuaUsdBalance: +status.vUsdBalance.toFixed(2),
        VirtuaBaycBalance: +status.vBaycBalance.toFixed(2),
      });
    }
    
    result.push({});
    
    result.push({
      Collateral: 'Virtual Collateral',
      AccountValue: 'Insurance Fund',
      NotionalValue: 'Total Fee',
      PNL: 'Contract Collateral',
      Margin: 'Price',
    })

    result.push({
      Id: 'Contract',
      Collateral: +this.virtualCollateral.toFixed(2),
      AccountValue: +this.insuranceFunds.toFixed(2),
      NotionalValue: +this.feeCollector.toFixed(2),
      PNL: +this.realCollateral.toFixed(2),
      Margin: +this.price.toFixed(2),
    })
    

    console.table(result);
  }

  return Pool;
}