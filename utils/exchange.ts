import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { compareResult, Require } from "./basics";

import int256 from "./int256";
import uint256 from "./uint256";

export interface User {
  account: SignerWithAddress;
  vUsdBalance: int256;
  vBaycBalance: int256;
  collateral: int256;
} 

export interface UserStatus extends User {
  margin: int256;
  notionalValue: int256;
  accountValue: int256;
  pnl: int256;
}

export interface PoolType {
  vBaycPoolSize: uint256;
  vUsdPoolSize: uint256;
}

export interface VirtualBalance {
  virtualCollateral: int256;
  uservUsdBalance: int256;
  uservBaycBalance: int256;
}

export interface LogType {
  from: number;
  to: number;
  amount: int256;
  desc?: string;
}

export const SWAP_FEE = 10 / 10000;
export const DISCOUNT_RATE = 0.2;
export const SAFE_MARGIN = 0.6;
export const MAINTENANCE_MARGIN = 0.5;
export const ATUO_CLOSE_MARGIN = 0.4;

export function organizeTestPool(price: int256, poolsize: int256, exchangeContract: any, usdcContract: any) {
  const Pool = Object.create(null);

  Pool.vBaycPoolSize = uint256(poolsize);
  Pool.vUsdPoolSize = uint256(price.multipliedBy(poolsize));

  Pool.userInitCollateral = [] as Array<uint256>;
  Pool.collateral = [] as Array<uint256>;
  Pool.virtualBalances = [] as Array<VirtualBalance>;
  Pool.userAccounts = [] as Array<SignerWithAddress>;
  Pool.userCount = 0;
  Pool.logs = [] as Array<LogType>;
  Pool.activeUsers = [] as Array<String>;

  Pool.virtualCollateral = int256(0);
  Pool.realCollateral = uint256(0);
  Pool.insuranceFunds = uint256(0);
  Pool.feeCollector = uint256(0);

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
      this.vBaycPoolSize = uint256(vBaycPoolSize.value);
      this.vUsdPoolSize = uint256(vUsdPoolSize.value);
    }
  });

  Pool.addUser = function (address: SignerWithAddress, collateral: int256) {
    this.userCount++;
    this.userAccounts.push(address);
    this.collateral.push(uint256(0));
    this.userInitCollateral.push(uint256(collateral));
    this.virtualBalances.push({
      virtualCollateral: int256(0),
      uservUsdBalance: int256(0),
      uservBaycBalance: int256(0),
    });
    this.depositCollateral(this.userCount - 1, uint256(collateral));
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

  Pool.getUserCollateral = function (userId: number): int256 {
    if (userId >= this.userCount) return int256(0);

    return this.collateral[userId].value;
  }

  Pool.getUservUsdBalance = function (userId: number): int256 {
    if (userId >= this.userCount) return int256(0);

    return this.virtualBalances[userId].uservUsdBalance;
  }
    
  Pool.getUservBaycBalance = function (userId: number): int256 {
    if (userId >= this.userCount) return int256(0);

    return this.virtualBalances[userId].uservBaycBalance;
  }

  Pool.addVusdBalance = function (usdAmount: int256, poolState: PoolType | undefined): PoolType {
    const state: PoolType = poolState || this.poolState;
    const k = state.vBaycPoolSize.value.multipliedBy(state.vUsdPoolSize.value);
    const newvUsdPoolSize = state.vUsdPoolSize.value.plus(usdAmount);
    const newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);

    return {
      vBaycPoolSize: uint256(newvBaycPoolSize),
      vUsdPoolSize: uint256(newvUsdPoolSize),
    }
  }

  Pool.removeVusdBalance = function (usdAmount: int256, poolState: PoolType | undefined): PoolType {
    return this.addVusdBalance(usdAmount.negated(), poolState);
  }

  Pool.addBaycBalance = function (baycAmount: int256, poolState: PoolType | undefined): PoolType {
    const state: PoolType = poolState || this.poolState;
    const k = state.vBaycPoolSize.value.multipliedBy(state.vUsdPoolSize.value);
    const newvBaycPoolSize = state.vBaycPoolSize.value.plus(baycAmount);
    const newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);

    return {
      vBaycPoolSize: uint256(newvBaycPoolSize),
      vUsdPoolSize: uint256(newvUsdPoolSize),
    }
  }

  Pool.removeBaycBalance = function (baycAmount: int256, poolState: PoolType | undefined): PoolType {
    return this.addBaycBalance(baycAmount.negated(), poolState);
  }

  Pool.updateUserBalance = function (userId: number, vBaycSize: int256, vUsdSize: int256 | number): void {
    if (userId >= this.userCount) return;

    this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.plus(vUsdSize);
    this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.plus(vBaycSize);
  }

  Pool.depositCollateral = function (userId: number, amount: uint256, desc = 'deposit') {
    if (userId >= this.userCount) return;
    
    this.collateral[userId] = uint256(this.collateral[userId].value.plus(amount.value));
    this.realCollateral = uint256(this.realCollateral.value.plus(amount.value));
    this.virtualCollateral = this.virtualCollateral.plus(amount.value);
  }

  Pool.withdrawCollateral = function (userId: number, amount: uint256, desc = 'withdraw') {
    if (userId >= this.userCount) return;
    
    this.collateral[userId] = uint256(this.collateral[userId].value.minus(amount.value));
    this.realCollateral = uint256(this.realCollateral.value.minus(amount.value));
    this.virtualCollateral = this.virtualCollateral.minus(amount.value);
  }

  Pool.withdrawCollateralByFee = function (userId: number, amount: uint256, desc = 'fee') {
    if (userId >= this.userCount) return;
    
    this.feeCollector = uint256(this.feeCollector.value.plus(amount.value));
    this.collateral[userId] = uint256(this.collateral[userId].value.minus(amount.value));
    this.realCollateral = uint256(this.realCollateral.value.minus(amount.value));
    this.virtualCollateral = this.virtualCollateral.minus(amount.value);
  }

  Pool.withdrawCollateralByInsuranceFund = function (userId: number, amount: uint256, desc = 'insurance fund') {
    if (userId >= this.userCount) return;
    
    this.insuranceFunds = uint256(this.insuranceFunds.value.plus(amount.value));
    this.collateral[userId] = uint256(this.collateral[userId].value.minus(amount.value));
    this.virtualCollateral = this.virtualCollateral.minus(amount.value);
  }


  Pool.addUserCollateral = function (userId: number, amount: uint256, desc = '') {
    if (userId >= this.userCount) return;

    this.collateral[userId] = uint256(this.collateral[userId].value.plus(amount.value));
    this.virtualCollateral = this.virtualCollateral.minus(amount.value);

    this.logs.push({
      from: -1,   // contract
      to: userId,
      amount: amount.value.negated(),
      desc
    });
  }

  Pool.reduceUserCollateral = function (userId: number, amount: uint256, desc = '') {
    if (userId >= this.userCount) return;

    this.collateral[userId] = uint256(this.collateral[userId].value.minus(amount.value));
    this.virtualCollateral = this.virtualCollateral.plus(amount.value);

    this.logs.push({
      from: userId,
      to: -1,   // contract
      amount: amount.value,
      desc
    });
  }

  Pool.getLongBaycAmountOut = function (_vUsdAmount: int256, poolState: PoolType | undefined): int256 {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value.multipliedBy(vBaycPoolSize.value);
    return vBaycPoolSize.value.minus(K.dividedBy(vUsdPoolSize.value.plus(_vUsdAmount)));
  }

  Pool.getLongVusdAmountOut = function (_vBaycAmount: int256, poolState: PoolType | undefined): int256 {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value.multipliedBy(vBaycPoolSize.value);
    return K.dividedBy(vBaycPoolSize.value.minus(_vBaycAmount)).minus(vUsdPoolSize.value);
  }

  Pool.getShortBaycAmountOut = function (_vUsdAmount: int256, poolState: PoolType | undefined): int256 {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value.multipliedBy(vBaycPoolSize.value);
    return K.dividedBy(vUsdPoolSize.value.minus(_vUsdAmount)).minus(vBaycPoolSize.value);
  }

  Pool.getShortVusdAmountOut = function (_vBaycAmount: int256, poolState: PoolType | undefined): int256 {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value.multipliedBy(vBaycPoolSize.value);
    return vUsdPoolSize.value.minus(K.dividedBy(vBaycPoolSize.value.plus(_vBaycAmount)));
  }

  Pool.getVusdAmountOut = function (baycAmount: int256, poolState: PoolType): int256 {
    if (baycAmount.gt(0))      return this.getShortVusdAmountOut(baycAmount, poolState);
    else if (baycAmount.lt(0)) return this.getLongVusdAmountOut(baycAmount.abs(), poolState);
    return int256(0);
  }

  Pool.getNotionalValue = function (userId: number, poolState: PoolType): int256 {
    if (userId >= this.userCount) return int256(0);

    const baycBalance = this.virtualBalances[userId].uservBaycBalance;
    
    return this.getVusdAmountOut(baycBalance, poolState);
  }

  Pool.getPNL = function (userId: number, poolState: PoolType): int256 {
    if (userId >= this.userCount) return int256(0);

    const notionalValue = this.getNotionalValue(userId, poolState);
    const usdBalance = this.virtualBalances[userId].uservUsdBalance;
    const baycBalance = this.virtualBalances[userId].uservBaycBalance;

    let pnl = int256(0);
    if (baycBalance.gt(0))      pnl = notionalValue.plus(usdBalance);
    else if (baycBalance.lt(0)) pnl = usdBalance.minus(notionalValue);

    return pnl;
  }

  Pool.getAccountValue = function (userId: number, poolState: PoolType): int256 {
    if (userId >= this.userCount) return int256(0);

    const pnl = this.getPNL(userId, poolState);
    const baycBalance = this.virtualBalances[userId].uservBaycBalance;
    const collateral = this.collateral[userId].value;

    let accountValue = int256(collateral);
    // TODO: add virtual collateral
    if (! baycBalance.eq(0)) accountValue = collateral.plus(pnl);

    return accountValue;
  }

  Pool.getMargin = function (userId: number, poolState: PoolType): int256 {
    if (userId >= this.userCount) return int256(0);

    const accountValue = this.getAccountValue(userId, poolState);
    const notionalValue = this.getNotionalValue(userId, poolState);
    const baycBalance = this.virtualBalances[userId].uservBaycBalance;

    let margin = int256(0);
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

  Pool.isNewMarginLiquidatable = function(userId: number, _usdAmount: int256, poolState: PoolType): boolean {
    const accountValue = this.getAccountValue(userId, poolState);
    const positionNotional = uint256(this.getNotionalValue(userId, poolState));
    const newPositionNotional = uint256(positionNotional.value.plus(_usdAmount));
    const newMargin = accountValue.dividedBy(int256(newPositionNotional)).multipliedBy(100);
    
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

  Pool.calculatePartialLiquidateValue = function(userId: number, poolState: PoolType): int256 {
    const accountValue = this.getAccountValue(userId, poolState);
    const notionalValue = this.getNotionalValue(userId, poolState);
    const numerator = notionalValue.multipliedBy(SAFE_MARGIN).minus(accountValue.abs()).decimalPlaces(18, 1);
    const denominator = int256(SAFE_MARGIN).minus(DISCOUNT_RATE);
    const x = numerator.dividedBy(denominator);
    return x;
  }

  Pool.partialLiquidate = function (userId: number, poolState: PoolType): PoolType {
    let vBaycNewPoolSize = poolState.vBaycPoolSize;
    let vUsdNewPoolSize = poolState.vUsdPoolSize;

    const liquidateAmount = this.calculatePartialLiquidateValue(userId, poolState);
    // const baycLiquidateAmount = liquidateAmount.multipliedBy(this.vBaycPoolSize.value).dividedBy(this.vUsdPoolSize.value);

    const userUsdBalance = this.virtualBalances[userId].uservUsdBalance;
    const userBaycBalance = this.virtualBalances[userId].uservBaycBalance;
    if (userBaycBalance.gt(0)) {
      // const usdBaycValue = this.getShortVusdAmountOut(baycLiquidateAmount);
      const usdBaycValue = liquidateAmount;
      const baycLiquidateAmount = this.getShortBaycAmountOut(usdBaycValue);
      const userPartialvUsdBalance = userUsdBalance.multipliedBy(int256(baycLiquidateAmount)).dividedBy(userBaycBalance);

      if (usdBaycValue.gt(userPartialvUsdBalance.abs())) {
        const pnl = usdBaycValue.minus(userPartialvUsdBalance.abs());
        this.addUserCollateral(userId, uint256(pnl), 'trading profit');
      } else if (usdBaycValue.lt(userPartialvUsdBalance.abs())) {
        const pnl = userPartialvUsdBalance.abs().minus(usdBaycValue);
        this.reduceUserCollateral(userId, uint256(pnl), 'trading loss');
      }

      // TODO: realize funding reward of user      
      this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.minus(int256(baycLiquidateAmount));
      this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.plus(userPartialvUsdBalance.abs());

      // TODO: remove user
      let K = this.vBaycPoolSize.value.multipliedBy(this.vUsdPoolSize.value);
      this.vBaycPoolSize.value = this.vBaycPoolSize.value.plus(baycLiquidateAmount);
      this.vUsdPoolSize.value = K.dividedBy(this.vBaycPoolSize.value);

      K = vBaycNewPoolSize.value.multipliedBy(vUsdNewPoolSize.value);
      vBaycNewPoolSize.value = vBaycNewPoolSize.value.plus(baycLiquidateAmount);
      vUsdNewPoolSize.value = K.dividedBy(vBaycNewPoolSize.value);
    }
    else if (userBaycBalance.lt(0)) {
      const usdBaycValue = liquidateAmount;
      const baycLiquidateAmount = this.getLongVusdAmountOut(usdBaycValue);
      const userPartialvUsdBalance = userUsdBalance.multipliedBy(int256(baycLiquidateAmount)).dividedBy(userBaycBalance);
      
      if (usdBaycValue.gt(userPartialvUsdBalance.abs())) {
        const pnl = usdBaycValue.minus(userPartialvUsdBalance.abs());
        this.reduceUserCollateral(userId, uint256(pnl), 'trading loss');
      }
      if (usdBaycValue.lt(userPartialvUsdBalance.abs())) {
        const pnl = userPartialvUsdBalance.abs().minus(usdBaycValue);
        this.addUserCollateral(userId, uint256(pnl), 'trading profit');
      }
      
      // TODO: realize funding reward of user
      this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.plus(int256(baycLiquidateAmount));
      this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.minus(userPartialvUsdBalance.abs());

      // TODO: remove user
      let K = this.vBaycPoolSize.value.multipliedBy(this.vUsdPoolSize.value);
      this.vBaycPoolSize.value = this.vBaycPoolSize.value.minus(baycLiquidateAmount);
      this.vUsdPoolSize.value = K.dividedBy(this.vBaycPoolSize.value);

      K = vBaycNewPoolSize.value.multipliedBy(vUsdNewPoolSize.value);
      vBaycNewPoolSize.value = vBaycNewPoolSize.value.minus(baycLiquidateAmount);
      vUsdNewPoolSize.value = K.dividedBy(vBaycNewPoolSize.value);
    }
    const discountAmount = uint256(liquidateAmount.multipliedBy(DISCOUNT_RATE));
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
        this.addUserCollateral(userId, uint256(pnl), 'trading profit');
      } else if (usdBaycValue.lt(userUsdBalance.abs())) {
        const pnl = userUsdBalance.abs().minus(usdBaycValue);
        this.reduceUserCollateral(userId, uint256(pnl), 'trading loss');
      }

      // TODO: realize funding reward of user
      this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.minus(userBaycBalance);
      this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.minus(userUsdBalance);

      // TODO: remove user
      let K = this.vBaycPoolSize.value.multipliedBy(this.vUsdPoolSize.value);
      this.vBaycPoolSize.value = this.vBaycPoolSize.value.plus(userBaycBalance);
      this.vUsdPoolSize.value = K.dividedBy(this.vBaycPoolSize.value);

      K = vBaycNewPoolSize.value.multipliedBy(vUsdNewPoolSize.value);
      vBaycNewPoolSize.value = vBaycNewPoolSize.value.plus(userBaycBalance);
      vUsdNewPoolSize.value = K.dividedBy(vBaycNewPoolSize.value);
    }
    else if (userBaycBalance.lt(0)) {
      const _assetSize = userBaycBalance.abs();
      const usdBaycValue = this.getLongVusdAmountOut(_assetSize);

      if (usdBaycValue.gt(userUsdBalance)) {
        const pnl = usdBaycValue.minus(userUsdBalance);
        this.reduceUserCollateral(userId, uint256(pnl), 'trading loss');
      } else if (usdBaycValue.lt(Math.abs(userUsdBalance))) {
        const pnl = userUsdBalance.minus(usdBaycValue);
        this.addUserCollateral(userId, uint256(pnl), 'trading profit');
      }

      // TODO: realize funding reward of user
      this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.minus(userBaycBalance);
      this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.minus(userUsdBalance);

      // TODO: remove user
      let K = this.vBaycPoolSize.value.multipliedBy(this.vUsdPoolSize.value);
      this.vBaycPoolSize.value = this.vBaycPoolSize.value.plus(userBaycBalance);
      this.vUsdPoolSize.value = K.dividedBy(this.vBaycPoolSize.value);

      K = vBaycNewPoolSize.value.multipliedBy(vUsdNewPoolSize.value);
      vBaycNewPoolSize.value = vBaycNewPoolSize.value.plus(userBaycBalance);
      vUsdNewPoolSize.value = K.dividedBy(vBaycNewPoolSize.value);
    }
    const discountAmount = uint256(this.collateral[userId].value.multipliedBy(DISCOUNT_RATE));
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
        if (userMargin.gt(0)) {
          newPoolState = this.hardLiquidate(i, newPoolState);
        } else if (userMargin.lt(0)) {
          newPoolState = this.hardNegativeLiquidate(i, newPoolState);
        }
      }
    }
    return newPoolState;
  }

  Pool.openLongPosition = function (userId: number, _usdAmount: int256, _minimumBaycAmountOut: int256) {
    let newPoolState = this.addVusdBalance(_usdAmount);

    const isNewMarginHardLiquidatable = this.isNewMarginLiquidatable(userId, _usdAmount, newPoolState);
    Require(
      isNewMarginHardLiquidatable == false, 
      "Insufficient margin to open position with requested size."
    );

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);
    newPoolState = this.addVusdBalance(_usdAmount);

    const userBayc = uint256(this.vBaycPoolSize.value.minus(newPoolState.vBaycPoolSize.value));
    Require(userBayc.value.gte(_minimumBaycAmountOut), "INSUFFICIENT_OUTPUT_AMOUNT");
    this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.plus(int256(userBayc));
    this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.minus(int256(_usdAmount));

    // TODO: add active user
    
    const fee = uint256(_usdAmount.multipliedBy(SWAP_FEE));
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = newPoolState;
  }

  Pool.openShortPosition = function (userId: number, _usdAmount: int256, _minimumBaycAmountOut: int256) {
    let newPoolState = this.removeVusdBalance(_usdAmount);

    const isNewMarginHardLiquidatable = this.isNewMarginLiquidatable(userId, _usdAmount, newPoolState);
    Require(
      isNewMarginHardLiquidatable == false, 
      "Insufficient margin to open position with requested size."
    );

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);
    newPoolState = this.removeVusdBalance(_usdAmount);

    const userBayc = uint256(newPoolState.vBaycPoolSize.value.minus(this.vBaycPoolSize.value));
    Require(userBayc.value.gte(_minimumBaycAmountOut), "INSUFFICIENT_OUTPUT_AMOUNT");
    this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.minus(int256(userBayc));
    this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.plus(int256(_usdAmount));

    // TODO: add active user
    
    const fee = uint256(_usdAmount.multipliedBy(SWAP_FEE));
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = newPoolState;
  }

  Pool.closePositionComplete = function (userId: number, _minimumUsdOut: int256) {
    const assetSize = this.virtualBalances[userId].uservBaycBalance.abs();
    this.closePosition(userId, assetSize, _minimumUsdOut);
  }

  Pool.closePosition = function (userId: number, _assetSize: int256, _minimumUsdOut: int256) {
    Require(
      _assetSize.lte(this.virtualBalances[userId].uservBaycBalance.abs()), 
      "Reduce only order can only close size equal or less than the outstanding asset size."
    );

    if (this.virtualBalances[userId].uservBaycBalance.gt(0)) {
      this.closeLongPosition(userId, _assetSize, _minimumUsdOut);
    } else if (this.virtualBalances[userId].uservBaycBalance.lt(0)) {
      this.closeShortPosition(userId, _assetSize, _minimumUsdOut);
    }
  }

  Pool.closeLongPosition = function (userId: number, _assetSize: int256, _minimumUsdOut: int256) {
    Require(
      _assetSize.lte(this.virtualBalances[userId].uservBaycBalance.abs()), 
      "Reduce only order can only close long size equal or less than the outstanding asset size."
    );

    let newPoolState = this.addBaycBalance(_assetSize);

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);

    const usdBaycValue = uint256(this.getShortVusdAmountOut(_assetSize)).value;
    Require(usdBaycValue.gte(_minimumUsdOut), "INSUFFICIENT_OUTPUT_AMOUNT");
    const userPartialvUsdBalance = this.virtualBalances[userId].uservUsdBalance.multipliedBy(int256(_assetSize))
        .dividedBy(this.virtualBalances[userId].uservBaycBalance);
    
    if (usdBaycValue.gt(userPartialvUsdBalance.abs())) {
      const pnl = uint256(usdBaycValue.minus(userPartialvUsdBalance.abs()));
      this.addUserCollateral(userId, pnl, 'trading profit');
    } else if (usdBaycValue.lt(userPartialvUsdBalance.abs())) {
      const pnl = uint256(userPartialvUsdBalance.abs().minus(usdBaycValue));
      this.reduceUserCollateral(userId, pnl, 'trading loss');
    }

    // TODO: add virtual collateral

    this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.minus(int256(_assetSize));
    this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.plus(userPartialvUsdBalance.abs());

    const fee = uint256(usdBaycValue.multipliedBy(SWAP_FEE));
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = this.addBaycBalance(_assetSize);
  }

  Pool.closeShortPosition = function (userId: number, _assetSize: int256, _minimumUsdOut: int256) {
    Require(
      _assetSize.lte(this.virtualBalances[userId].uservBaycBalance.abs()), 
      "Reduce only order can only close long size equal or less than the outstanding asset size."
    );

    let newPoolState = this.removeBaycBalance(_assetSize);

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);

    const usdBaycValue = uint256(this.getLongVusdAmountOut(_assetSize)).value;
    Require(usdBaycValue.gte(_minimumUsdOut), "INSUFFICIENT_OUTPUT_AMOUNT");
    const userPartialvUsdBalance = this.virtualBalances[userId].uservUsdBalance.multipliedBy(int256(_assetSize))
      .dividedBy(this.virtualBalances[userId].uservBaycBalance);
    
    if (usdBaycValue.gt(userPartialvUsdBalance.abs())) {
      const pnl = uint256(usdBaycValue.minus(userPartialvUsdBalance.abs()));
      this.reduceUserCollateral(userId, pnl, 'trading loss');
    } else if (usdBaycValue.lt(userPartialvUsdBalance.abs())) {
      const pnl = uint256(userPartialvUsdBalance.abs().minus(usdBaycValue));
      this.addUserCollateral(userId, pnl, 'trading profit');
    }

    // TODO: add virtual collateral

    this.virtualBalances[userId].uservBaycBalance = this.virtualBalances[userId].uservBaycBalance.plus(int256(_assetSize));
    this.virtualBalances[userId].uservUsdBalance = this.virtualBalances[userId].uservUsdBalance.minus(userPartialvUsdBalance.abs());

    const fee = uint256(usdBaycValue.multipliedBy(SWAP_FEE));
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = this.removeBaycBalance(_assetSize);
  }

  //get minimum long bayc amount that user receives
  Pool.getMinimumLongBaycOut = function (_usdAmount: uint256): uint256 {
    let vBaycPoolSize = int256(this.vBaycPoolSize);
    let vUsdPoolSize = int256(this.vUsdPoolSize);
    let k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    let newvUsdPoolSize = vUsdPoolSize.plus(int256(_usdAmount));
    let newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);

    for (let i = 0; i < this.userCount; i++) {
      // if (activeUsers[i] != address(0)) {
        const isHardLiquidatable = this.isHardLiquidatable(
          i,
          {
            vBaycPoolSize: uint256(newvBaycPoolSize),
            vUsdPoolSize: uint256(newvUsdPoolSize)
          }
        );
        if (isHardLiquidatable == true) {          
          //update new pool
          k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
          newvBaycPoolSize = newvBaycPoolSize.plus(this.virtualBalances[i].uservBaycBalance);
          newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);
          //update pool
          k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
          vBaycPoolSize = vBaycPoolSize.multipliedBy(this.virtualBalances[i].uservBaycBalance);
          vUsdPoolSize = k.dividedBy(vBaycPoolSize);
        }
      // }
    }

    for (let i = 0; i < this.userCount; i++) {
      // if (activeUsers[i] != address(0)) {
        const isPartialLiquidatable = this.isPartialLiquidatable(
          i,
          {
            vBaycPoolSize: uint256(newvBaycPoolSize),
            vUsdPoolSize: uint256(newvUsdPoolSize)
          }
        );
        if (isPartialLiquidatable == true) {
          const vUsdPartialLiquidateAmount = this.calculatePartialLiquidateValue(
            i,
            {
              vBaycPoolSize: uint256(newvBaycPoolSize),
              vUsdPoolSize: uint256(newvUsdPoolSize)
            }
          );
          if (this.virtualBalances[i].uservBaycBalance.gt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[i].uservBaycBalance.lt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          }
        }
      // }
    }

    k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    const finalvUsdPoolSize = vUsdPoolSize.plus(int256(_usdAmount));
    const finalvBaycPoolSize = k.dividedBy(finalvUsdPoolSize);
    const userBaycOut = vBaycPoolSize.minus(finalvBaycPoolSize);
    return uint256(userBaycOut);
  }

  //get minimum short bayc amount that user receives
  Pool.getMinimumShortBaycOut = function (_usdAmount: uint256): uint256 {
    let vBaycPoolSize = int256(this.vBaycPoolSize);
    let vUsdPoolSize = int256(this.vUsdPoolSize);
    let k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    let newvUsdPoolSize = vUsdPoolSize.minus(int256(_usdAmount));
    let newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);

    for (let i = 0; i < this.userCount; i++) {
      // if (activeUsers[i] != address(0)) {
        const isHardLiquidatable = this.isHardLiquidatable(
          i,
          {
            vBaycPoolSize: uint256(newvBaycPoolSize),
            vUsdPoolSize: uint256(newvUsdPoolSize)
          }
        );
        if (isHardLiquidatable == true) { 
          //update new pool
          k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
          newvBaycPoolSize = newvBaycPoolSize.plus(this.virtualBalances[i].uservBaycBalance);
          newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);
          //update pool
          k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
          vBaycPoolSize = vBaycPoolSize.plus(this.virtualBalances[i].uservBaycBalance);
          vUsdPoolSize = k.dividedBy(vBaycPoolSize);
        }
      // }
    }
    for (let i = 0; i < this.userCount; i++) {
      // if (activeUsers[i] != address(0)) {
        const isPartialLiquidatable = this.isPartialLiquidatable(
          i,
          {
            vBaycPoolSize: uint256(newvBaycPoolSize),
            vUsdPoolSize: uint256(newvUsdPoolSize)
          }
        );
        if (isPartialLiquidatable == true) {          
          const vUsdPartialLiquidateAmount = this.calculatePartialLiquidateValue(
            i,
            {
              vBaycPoolSize: uint256(newvBaycPoolSize),
              vUsdPoolSize: uint256(newvUsdPoolSize)
            }
          );
          if (this.virtualBalances[i].uservBaycBalance.gt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[i].uservBaycBalance.lt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          }
        }
      // }
    }

    k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    const finalvUsdPoolSize = vUsdPoolSize.minus(int256(_usdAmount));
    const finalvBaycPoolSize = k.dividedBy(finalvUsdPoolSize);
    const userBaycOut = finalvBaycPoolSize.minus(vBaycPoolSize);
    return uint256(userBaycOut);
  }

  //get minimum long usd amount that user receives
  Pool.getMinimumLongUsdOut = function (_BaycAmount: uint256): uint256 {
    let vBaycPoolSize = int256(this.vBaycPoolSize);
    let vUsdPoolSize = int256(this.vUsdPoolSize);
    let k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    let newvBaycPoolSize = vBaycPoolSize.minus(int256(_BaycAmount));
    let newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);


    for (let i = 0; i < this.userCount; i++) {
      // if (activeUsers[i] != address(0)) {
        const isHardLiquidatable = this.isHardLiquidatable(
          i,
          {
            vBaycPoolSize: uint256(newvBaycPoolSize),
            vUsdPoolSize: uint256(newvUsdPoolSize)
          }
        );
        if (isHardLiquidatable == true) {
          //update new pool
          k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
          newvBaycPoolSize = newvBaycPoolSize.plus(this.virtualBalances[i].uservBaycBalance);
          newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);
          //update pool
          k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
          vBaycPoolSize = vBaycPoolSize.plus(this.virtualBalances[i].uservBaycBalance);
          vUsdPoolSize = k.dividedBy(vBaycPoolSize);
        }
      // }
    }

    for (let i = 0; i < this.userCount; i++) {
      // if (activeUsers[i] != address(0)) {
        const isPartialLiquidatable = this.isPartialLiquidatable(
          i,
          {
            vBaycPoolSize: uint256(newvBaycPoolSize),
            vUsdPoolSize: uint256(newvUsdPoolSize)
          }
        );
        if (isPartialLiquidatable == true) {
          const vUsdPartialLiquidateAmount = this.calculatePartialLiquidateValue(
            i,
            {
              vBaycPoolSize: uint256(newvBaycPoolSize),
              vUsdPoolSize: uint256(newvUsdPoolSize)
            }
          );
          if (this.virtualBalances[i].uservBaycBalance.lt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[i].uservBaycBalance.lt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          }
        }
      // }
    }


    k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    const finalvBaycPoolSize = vBaycPoolSize.minus(int256(_BaycAmount));
    const finalvUsdPoolSize = k.dividedBy(finalvBaycPoolSize);
    const userUsdOut = finalvUsdPoolSize.minus(vUsdPoolSize);
    return uint256(userUsdOut);
  }

  //get minimum short usd amount that user receives
  Pool.getMinimumShortUsdOut = function (_BaycAmount: uint256): uint256 {
    let vBaycPoolSize = int256(this.vBaycPoolSize);
    let vUsdPoolSize = int256(this.vUsdPoolSize);
    let k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    let newvBaycPoolSize = vBaycPoolSize.plus(int256(_BaycAmount));
    let newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);

    for (let i = 0; i < this.userCount; i++) {
      // if (activeUsers[i] != address(0)) {
        const isHardLiquidatable = this.isHardLiquidatable(
          i,
          {
            vBaycPoolSize: uint256(newvBaycPoolSize),
            vUsdPoolSize: uint256(newvUsdPoolSize)
          }
        );
        if (isHardLiquidatable == true) {
          //update new pool
          k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
          newvBaycPoolSize = newvBaycPoolSize.plus(this.virtualBalances[i].uservBaycBalance);
          newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);
          //update pool
          k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
          vBaycPoolSize = vBaycPoolSize.plus(this.virtualBalances[i].uservBaycBalance);
          vUsdPoolSize = k.dividedBy(vBaycPoolSize);
        }
      // }
    }

    for (let i = 0; i < this.userCount; i++) {
      // if (activeUsers[i] != address(0)) {
        const isPartialLiquidatable = this.isPartialLiquidatable(
          i,
          {
            vBaycPoolSize: uint256(newvBaycPoolSize),
            vUsdPoolSize: uint256(newvUsdPoolSize)
          }
        );
        if (isPartialLiquidatable == true) {
          const vUsdPartialLiquidateAmount = this.calculatePartialLiquidateValue(
            i,
            {
              vBaycPoolSize: uint256(newvBaycPoolSize),
              vUsdPoolSize: uint256(newvUsdPoolSize)
            }
          );
          if (this.virtualBalances[i].uservBaycBalance.gt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[i].uservBaycBalance.lt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          }
        }
      // }
    }

    k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    const finalvBaycPoolSize = vBaycPoolSize.plus(int256(_BaycAmount));
    const finalvUsdPoolSize = k.dividedBy(finalvBaycPoolSize);
    const userUsdOut = vUsdPoolSize.minus(finalvUsdPoolSize);
    return uint256(userUsdOut);
  }

  // Pool.collateralCheck = function () {
  //   for (let i = 0; i < this.userCount; i++) {
  //     let temp = this.userInitCollateral[i].value;
  //     this.logs.filter((log: LogType) => log.from === i || log.to === i)
  //             .forEach((log: LogType) => temp = log.from === i ? temp - log.amount : temp + log.amount);
  //     if (! compareResult(temp, this.collateral[i].value)) return false;
  //   }

  //   const init = this.userInitCollateral.map((v: uint256) => v.value).reduce((a: number, b: number) => a + b, 0);
  //   const last = this.collateral.reduce((a: uint256, b: uint256) => a.value + b.value, 0) + this.virtualCollateral;

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

  //   report += `${this.userInitCollateral.map((v: uint256) => v.value).join(' + ')} = ${this.userInitCollateral.reduce((a: number, b: uint256) => a + b.value, 0)}\n`;
  //   report += `${this.collateral.map((v: uint256) => v.value).join(' + ')} + ${this.virtualCollateral} = ${this.collateral.reduce((a: number, b: uint256) => a + b.value, 0) + this.virtualCollateral}\n`;

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
      NotionalValue: 'Contract Collateral',
      PNL: 'Total Fee',
      Margin: 'Price',
    })

    result.push({
      Id: 'Contract',
      Collateral: +this.virtualCollateral.toFixed(2),
      AccountValue: +this.insuranceFunds.toFixed(2),
      NotionalValue: +this.realCollateral.toFixed(2),
      PNL: +this.feeCollector.toFixed(2),
      Margin: +this.price.toFixed(2),
    })
    

    console.table(result);
  }

  return Pool;
}