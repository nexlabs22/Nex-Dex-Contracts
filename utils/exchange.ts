import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { compareResult, roundDecimal, UnsignedInt } from "./basics";
import type { UnsignedIntType } from "./basics";

export interface User {
  account: SignerWithAddress;
  vUsdBalance: number;
  vBaycBalance: number;
  collateral: number;
}

export interface UserStatus extends User {
  margin: number;
  notionalValue: number;
  accountValue: number;
  pnl: number;
}

export interface PoolType {
  vBaycPoolSize: UnsignedIntType;
  vUsdPoolSize: UnsignedIntType;
}

export interface VirtualBalance {
  virtualCollateral: number;
  uservUsdBalance: number;
  uservBaycBalance: number;
}

export interface LogType {
  from: number;
  to: number;
  amount: number;
  desc?: string;
}

export const SWAP_FEE = 10 / 10000;
export const DISCOUNT_RATE = 0.2;
export const SAFE_MARGIN = 0.6;
export const MAINTENANCE_MARGIN = 0.5;
export const ATUO_CLOSE_MARGIN = 0.4;

export function organizeTestPool(price: number, poolsize: number, exchangeContract: any, usdcContract: any) {
  const Pool = Object.create(null);

  Pool.vBaycPoolSize = UnsignedInt(poolsize);
  Pool.vUsdPoolSize = UnsignedInt(price * poolsize);

  Pool.userInitCollateral = [] as Array<UnsignedIntType>;
  Pool.collateral = [] as Array<UnsignedIntType>;
  Pool.virtualBalances = [] as Array<VirtualBalance>;
  Pool.userAccounts = [] as Array<SignerWithAddress>;
  Pool.userCount = 0;
  Pool.logs = [] as Array<LogType>;

  Pool.virtualCollateral = 0;
  Pool.realCollateral = UnsignedInt(0);
  Pool.insuranceFunds = UnsignedInt(0);
  Pool.feeCollector = UnsignedInt(0);

  Pool.exchangeContract = exchangeContract;
  Pool.usdcContract = usdcContract;

  Object.defineProperty(Pool, 'price', {
    get: function () {
      return this.vUsdPoolSize.value / this.vBaycPoolSize.value;
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
      this.vBaycPoolSize = vBaycPoolSize;
      this.vUsdPoolSize = vUsdPoolSize;
    }
  });

  Pool.addUser = function (address: SignerWithAddress, collateral: number) {
    this.userCount++;
    this.userAccounts.push(address);
    this.collateral.push(UnsignedInt(collateral));
    this.userInitCollateral.push(UnsignedInt(collateral));
    this.virtualBalances.push({
      virtualCollateral: 0,
      uservUsdBalance: 0,
      uservBaycBalance: 0,
    })
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

  Pool.getUserCollateral = function (userId: number): number {
    if (userId >= this.userCount) return 0;

    return this.collateral[userId].value;
  }

  Pool.getUservUsdBalance = function (userId: number): number {
    if (userId >= this.userCount) return 0;

    return this.virtualBalances[userId].uservUsdBalance;
  }
    
  Pool.getUservBaycBalance = function (userId: number): number {
    if (userId >= this.userCount) return 0;

    return this.virtualBalances[userId].uservBaycBalance;
  }

  Pool.addVusdBalance = function (usdAmount: number, poolState: PoolType | undefined): PoolType {
    const state: PoolType = poolState || this.poolState;
    const k = state.vBaycPoolSize.value * state.vUsdPoolSize.value;
    const newvUsdPoolSize = state.vUsdPoolSize.value + usdAmount;
    const newvBaycPoolSize = k / newvUsdPoolSize;

    return {
      vBaycPoolSize: UnsignedInt(newvBaycPoolSize),
      vUsdPoolSize: UnsignedInt(newvUsdPoolSize),
    }
  }

  Pool.removeVusdBalance = function (usdAmount: number, poolState: PoolType | undefined): PoolType {
    return this.addVusdBalance(-usdAmount, poolState);
  }

  Pool.addBaycBalance = function (baycAmount: number, poolState: PoolType | undefined): PoolType {
    const state: PoolType = poolState || this.poolState;
    const k = state.vBaycPoolSize.value * state.vUsdPoolSize.value;
    const newvBaycPoolSize = state.vBaycPoolSize.value + baycAmount;
    const newvUsdPoolSize = k / newvBaycPoolSize;

    return {
      vBaycPoolSize: UnsignedInt(newvBaycPoolSize),
      vUsdPoolSize: UnsignedInt(newvUsdPoolSize),
    }
  }

  Pool.removeBaycBalance = function (baycAmount: number, poolState: PoolType | undefined): PoolType {
    return this.addBaycBalance(-baycAmount, poolState);
  }

  Pool.updateUserBalance = function (userId: number, vBaycSize: number, vUsdSize: number): void {
    if (userId >= this.userCount) return;

    this.virtualBalances[userId].uservUsdBalance += vUsdSize;
    this.virtualBalances[userId].uservBaycBalance += vBaycSize;
  }

  Pool.depositCollateral = function (userId: number, amount: UnsignedIntType, desc = 'deposit') {
    if (userId >= this.userCount) return;
    
    this.addUserCollateral(userId, amount, desc);
    this.realCollateral.value += amount.value;
  }

  Pool.withdrawCollateral = function (userId: number, amount: UnsignedIntType, desc = 'withdraw') {
    if (userId >= this.userCount) return;
    
    this.reduceUserCollateral(userId, amount, desc);
    this.realCollateral.value -= amount.value;
  }

  Pool.withdrawCollateralByFee = function (userId: number, amount: UnsignedIntType, desc = 'fee') {
    if (userId >= this.userCount) return;
    
    this.reduceUserCollateral(userId, amount, desc);
    this.feeCollector.value += amount.value;
  }

  Pool.withdrawCollateralByInsuranceFund = function (userId: number, amount: UnsignedIntType, desc = 'insurance fund') {
    if (userId >= this.userCount) return;
    
    this.reduceUserCollateral(userId, amount, desc);
    this.insuranceFunds.value += amount.value;
  }


  Pool.addUserCollateral = function (userId: number, amount: UnsignedIntType, desc = '') {
    if (userId >= this.userCount) return;

    this.updateUserCollateral(userId, -amount.value, desc);
  }

  Pool.reduceUserCollateral = function (userId: number, amount: UnsignedIntType, desc = '') {
    if (userId >= this.userCount) return;

    this.updateUserCollateral(userId, amount.value, desc);
  }

  Pool.updateUserCollateral = function (userId: number, amount: number, desc = '') {
    if (userId >= this.userCount) return;

    this.collateral[userId].value -= amount;
    this.virtualCollateral += amount;

    // if (desc) this.logs.push(desc);
    if (amount > 0) {
      this.logs.push({
        from: userId,
        to: -1,   // contract
        amount,
        desc
      });
    } else {
      this.logs.push({
        from: -1,   // contract
        to: userId,
        amount: -amount,
        desc
      });
    }
  }

  Pool.getLongBaycAmountOut = function (_vUsdAmount: number, poolState: PoolType | undefined): number {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value * vBaycPoolSize.value;
    return vBaycPoolSize.value -  K / (vUsdPoolSize.value + _vUsdAmount);
  }

  Pool.getLongVusdAmountOut = function (_vBaycAmount: number, poolState: PoolType | undefined): number {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value * vBaycPoolSize.value;
    return K / (vBaycPoolSize.value - _vBaycAmount) - vUsdPoolSize.value;
  }

  Pool.getShortBaycAmountOut = function (_vUsdAmount: number, poolState: PoolType | undefined): number {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value * vBaycPoolSize.value;
    return K / (vUsdPoolSize.value - _vUsdAmount) - vBaycPoolSize.value;
  }

  Pool.getShortVusdAmountOut = function (_vBaycAmount: number, poolState: PoolType | undefined): number {
    const { vUsdPoolSize, vBaycPoolSize } = poolState || this.poolState;
    const K = vUsdPoolSize.value * vBaycPoolSize.value;
    return vUsdPoolSize.value - K / (vBaycPoolSize.value + _vBaycAmount);
  }

  Pool.getVusdAmountOut = function (baycAmount: number, poolState: PoolType): number {
    if (baycAmount > 0)      return this.getShortVusdAmountOut(baycAmount, poolState);
    else if (baycAmount < 0) return this.getLongVusdAmountOut(Math.abs(baycAmount), poolState);
    return 0;
  }

  Pool.getNotionalValue = function (userId: number, poolState: PoolType): number {
    if (userId >= this.userCount) return 0;

    const baycBalance = this.virtualBalances[userId].uservBaycBalance;
    
    return this.getVusdAmountOut(baycBalance, poolState);
  }

  Pool.getPNL = function (userId: number, poolState: PoolType): number {
    if (userId >= this.userCount) return 0;

    const notionalValue = this.getNotionalValue(userId, poolState);
    const usdBalance = this.virtualBalances[userId].uservUsdBalance;
    const baycBalance = this.virtualBalances[userId].uservBaycBalance;

    let pnl = 0;
    if (baycBalance > 0)      pnl = notionalValue + usdBalance;
    else if (baycBalance < 0) pnl = usdBalance - notionalValue;

    return pnl;
  }

  Pool.getAccountValue = function (userId: number, poolState: PoolType): number {
    if (userId >= this.userCount) return 0;

    const pnl = this.getPNL(userId, poolState);
    const baycBalance = this.virtualBalances[userId].uservBaycBalance;
    const collateral = this.collateral[userId].value;

    let accountValue = collateral;
    // TODO: add virtual collateral
    if (baycBalance != 0) accountValue = collateral + pnl;

    return accountValue;
  }

  Pool.getMargin = function (userId: number, poolState: PoolType): number {
    if (userId >= this.userCount) return 0;

    const accountValue = this.getAccountValue(userId, poolState);
    const notionalValue = this.getNotionalValue(userId, poolState);
    const baycBalance = this.virtualBalances[userId].uservBaycBalance;

    let margin = 0;
    if (baycBalance != 0) margin = accountValue / notionalValue * 100.0;

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

  Pool.isNewMarginLiquidatable = function(userId: number, _usdAmount: number, poolState: PoolType): boolean {
    const accountValue = this.getAccountValue(userId, poolState);
    const positionNotional = UnsignedInt(this.getNotionalValue(userId, poolState));
    const newPositionNotional = UnsignedInt(positionNotional.value + _usdAmount);
    const newMargin = 100 * accountValue / newPositionNotional.value;
    
    if (newMargin != 0 && newMargin <= SAFE_MARGIN) {
      return true;
    } else {
      return false;
    }
  }

  Pool.isPartialLiquidatable = function (userId: number, poolState: PoolType): boolean {
    if (userId >= this.userCount) return false;
    const margin = Math.floor(this.getMargin(userId, poolState)) / 100;

    if (ATUO_CLOSE_MARGIN <= margin && margin <= MAINTENANCE_MARGIN) return true;
    return false;
  }

  Pool.isHardLiquidatable = function (userId: number, poolState: PoolType): boolean {
    if (userId >= this.userCount) return false;
    const margin = Math.floor(this.getMargin(userId, poolState)) / 100;

    if (margin != 0 && margin <= ATUO_CLOSE_MARGIN) return true;
    return false;
  }

  Pool.calculatePartialLiquidateValue = function(userId: number, poolState: PoolType): number {
    const accountValue = this.getAccountValue(userId, poolState);
    const notionalValue = this.getNotionalValue(userId, poolState);
    const numerator = notionalValue * SAFE_MARGIN - Math.abs(accountValue);
    const denominator = SAFE_MARGIN - DISCOUNT_RATE;
    const x = numerator / denominator;
    return x;
  }

  Pool.partialLiquidate = function (userId: number, poolState: PoolType): PoolType {
    let vBaycNewPoolSize = poolState.vBaycPoolSize;
    let vUsdNewPoolSize = poolState.vUsdPoolSize;

    const liquidateAmount = this.calculatePartialLiquidateValue(userId, poolState);
    const baycLiquidateAmount = liquidateAmount * this.vBaycPoolSize.value / this.vUsdPoolSize.value;

    const userUsdBalance = this.virtualBalances[userId].uservUsdBalance;
    const userBaycBalance = this.virtualBalances[userId].uservBaycBalance;
    if (userBaycBalance > 0) {
      const usdBaycValue = this.getShortVusdAmountOut(baycLiquidateAmount);
      const userPartialvUsdBalance = userUsdBalance * baycLiquidateAmount / userBaycBalance;

      if (usdBaycValue > Math.abs(userPartialvUsdBalance)) {
        const pnl = usdBaycValue - Math.abs(userPartialvUsdBalance);
        this.addUserCollateral(userId, UnsignedInt(pnl), 'trading profit');
      } else if (usdBaycValue < Math.abs(userPartialvUsdBalance)) {
        const pnl = Math.abs(userPartialvUsdBalance) - usdBaycValue;
        this.reduceUserCollateral(userId, UnsignedInt(pnl), 'trading loss');
      }

      // TODO: realize funding reward of user      
      this.virtualBalances[userId].uservBaycBalance -= baycLiquidateAmount;
      this.virtualBalances[userId].uservUsdBalance += Math.abs(userPartialvUsdBalance);

      // TODO: remove user
      const K = this.vBaycPoolSize.value * this.vUsdPoolSize.value;
      this.vBaycPoolSize.value += baycLiquidateAmount;
      this.vUsdPoolSize.value = K / this.vBaycPoolSize.value;

      vBaycNewPoolSize.value += baycLiquidateAmount;
      vUsdNewPoolSize.value = K / vBaycNewPoolSize.value;
    }
    else if (userBaycBalance < 0) {
      const usdBaycValue = this.getLongVusdAmountOut(baycLiquidateAmount);
      const userPartialvUsdBalance = (userUsdBalance * baycLiquidateAmount) / userBaycBalance;
      
      if (usdBaycValue > Math.abs(userPartialvUsdBalance)) {
        const pnl = usdBaycValue - Math.abs(userPartialvUsdBalance);
        this.reduceUserCollateral(userId, UnsignedInt(pnl), 'trading loss');
      }
      if (usdBaycValue < Math.abs(userPartialvUsdBalance)) {
        const pnl = Math.abs(userPartialvUsdBalance) - usdBaycValue;
        this.addUserCollateral(userId, UnsignedInt(pnl), 'trading profit');
      }
      
      // TODO: realize funding reward of user
      this.virtualBalances[userId].uservBaycBalance += baycLiquidateAmount;
      this.virtualBalances[userId].uservUsdBalance -= Math.abs(userPartialvUsdBalance);

      // TODO: remove user
      const K = this.vBaycPoolSize.value * this.vUsdPoolSize.value;
      this.vBaycPoolSize.value -= baycLiquidateAmount;
      this.vUsdPoolSize.value = K / this.vBaycPoolSize.value;

      vBaycNewPoolSize.value -= baycLiquidateAmount;
      vUsdNewPoolSize.value = K / vBaycNewPoolSize.value;
    }
    const discountAmount = UnsignedInt(liquidateAmount * DISCOUNT_RATE);
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
    if (userBaycBalance > 0) {
      const usdBaycValue = this.getShortVusdAmountOut(userBaycBalance);

      if (usdBaycValue > Math.abs(userUsdBalance)) {
        const pnl = usdBaycValue - Math.abs(userUsdBalance);
        this.addUserCollateral(userId, UnsignedInt(pnl), 'trading profit');
      } else if (usdBaycValue < Math.abs(userUsdBalance)) {
        const pnl = Math.abs(userUsdBalance) - usdBaycValue;
        this.reduceUserCollateral(userId, UnsignedInt(pnl), 'trading loss');
      }

      // TODO: realize funding reward of user
      this.virtualBalances[userId].uservBaycBalance -= userBaycBalance;
      this.virtualBalances[userId].uservUsdBalance -= userUsdBalance;

      // TODO: remove user
      const K = this.vBaycPoolSize.value * this.vUsdPoolSize.value;
      this.vBaycPoolSize.value += userBaycBalance;
      this.vUsdPoolSize.value = K / this.vBaycPoolSize.value;

      vBaycNewPoolSize.value += userBaycBalance;
      vUsdNewPoolSize.value = K / vBaycNewPoolSize.value;
    }
    else if (userBaycBalance < 0) {
      const _assetSize = Math.abs(userBaycBalance);
      const usdBaycValue = this.getLongVusdAmountOut(_assetSize);

      if (usdBaycValue > userUsdBalance) {
        const pnl = usdBaycValue - userUsdBalance;
        this.reduceUserCollateral(userId, UnsignedInt(pnl), 'trading loss');
      } else if (usdBaycValue < Math.abs(userUsdBalance)) {
        const pnl = userUsdBalance - usdBaycValue;
        this.addUserCollateral(userId, UnsignedInt(pnl), 'trading profit');
      }

      // TODO: realize funding reward of user
      this.virtualBalances[userId].uservBaycBalance -= userBaycBalance;
      this.virtualBalances[userId].uservUsdBalance -= userUsdBalance;

      // TODO: remove user
      const K = this.vBaycPoolSize.value * this.vUsdPoolSize.value;
      this.vBaycPoolSize.value += userBaycBalance;
      this.vUsdPoolSize.value = K / this.vBaycPoolSize.value;

      vBaycNewPoolSize.value -= userBaycBalance;
      vUsdNewPoolSize.value = K / vBaycNewPoolSize.value;
    }
    const discountAmount = UnsignedInt(this.collateral[userId].value * DISCOUNT_RATE);
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

  Pool.openLongPosition = function (userId: number, _usdAmount: number) {
    let newPoolState = this.addVusdBalance(_usdAmount);

    const isNewMarginHardLiquidatable = this.isNewMarginLiquidatable(userId, _usdAmount, newPoolState);
    if (isNewMarginHardLiquidatable) {
      throw new Error("Insufficient margin to open position with requested size.");
    }

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);
    newPoolState = this.addVusdBalance(_usdAmount);

    const userBayc = UnsignedInt(this.vBaycPoolSize.value - newPoolState.vBaycPoolSize.value);
    this.virtualBalances[userId].uservBaycBalance += userBayc.value;
    this.virtualBalances[userId].uservUsdBalance -= _usdAmount;

    // TODO: add active user
    
    const fee = UnsignedInt(_usdAmount * SWAP_FEE);
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = newPoolState;
  }

  Pool.openShortPosition = function (userId: number, _usdAmount: number) {
    let newPoolState = this.removeVusdBalance(_usdAmount);

    const isNewMarginHardLiquidatable = this.isNewMarginLiquidatable(userId, _usdAmount, newPoolState);
    if (isNewMarginHardLiquidatable) {
      throw new Error("Insufficient margin to open position with requested size.");
    }

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);
    newPoolState = this.removeVusdBalance(_usdAmount);

    const userBayc = UnsignedInt(newPoolState.vBaycPoolSize.value - this.vBaycPoolSize.value);
    this.virtualBalances[userId].uservBaycBalance -= userBayc.value;
    this.virtualBalances[userId].uservUsdBalance += _usdAmount;

    // TODO: add active user
    
    const fee = UnsignedInt(_usdAmount * SWAP_FEE);
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = newPoolState;
  }

  Pool.closePositionComplete = function (userId: number) {
    const assetSize = Math.abs(this.virtualBalances[userId].uservBaycBalance);
    this.closePosition(userId, assetSize);
  }

  Pool.closePosition = function (userId: number, _assetSize: number) {
    if (_assetSize > Math.abs(this.virtualBalances[userId].uservBaycBalance)) {
      throw new Error("Reduce only order can only close size equal or less than the outstanding asset size.");
    }

    if (this.virtualBalances[userId].uservBaycBalance > 0) {
      this.closeLongPosition(userId, _assetSize);
    } else if (this.virtualBalances[userId].uservBaycBalance < 0) {
      this.closeShortPosition(userId, _assetSize);
    }
  }

  Pool.closeLongPosition = function (userId: number, _assetSize: number) {
    if (_assetSize > Math.abs(this.virtualBalances[userId].uservBaycBalance)) {
      throw new Error("Reduce only order can only close long size equal or less than the outstanding asset size.");
    }

    let newPoolState = this.addBaycBalance(_assetSize);

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);

    const usdBaycValue = UnsignedInt(this.getShortVusdAmountOut(_assetSize)).value;

    const userPartialvUsdBalance = (this.virtualBalances[userId].uservUsdBalance * _assetSize) / 
      this.virtualBalances[userId].uservBaycBalance;
    
    if (usdBaycValue > Math.abs(userPartialvUsdBalance)) {
      const pnl = UnsignedInt(usdBaycValue - Math.abs(userPartialvUsdBalance));
      this.addUserCollateral(userId, pnl, 'trading profit');
    } else if (usdBaycValue < Math.abs(userPartialvUsdBalance)) {
      const pnl = UnsignedInt(Math.abs(userPartialvUsdBalance) - usdBaycValue);
      this.reduceUserCollateral(userId, pnl, 'trading loss');
    }

    // TODO: add virtual collateral

    this.virtualBalances[userId].uservBaycBalance -= _assetSize;
    this.virtualBalances[userId].uservUsdBalance += Math.abs(userPartialvUsdBalance);

    const fee = UnsignedInt(usdBaycValue * SWAP_FEE);
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = this.addBaycBalance(_assetSize);
  }

  Pool.closeShortPosition = function (userId: number, _assetSize: number) {
    if (_assetSize > Math.abs(this.virtualBalances[userId].uservBaycBalance)) {
      throw new Error("Reduce only order can only close long size equal or less than the outstanding asset size.");
    }

    let newPoolState = this.removeBaycBalance(_assetSize);

    newPoolState = this.hardLiquidateUsers(newPoolState);
    newPoolState = this.partialLiquidateUsers(newPoolState);

    const usdBaycValue = UnsignedInt(this.getLongVusdAmountOut(_assetSize)).value;

    const userPartialvUsdBalance = (this.virtualBalances[userId].uservUsdBalance * _assetSize) / 
      this.virtualBalances[userId].uservBaycBalance;
    
    if (usdBaycValue > Math.abs(userPartialvUsdBalance)) {
      const pnl = UnsignedInt(usdBaycValue - Math.abs(userPartialvUsdBalance));
      this.reduceUserCollateral(userId, pnl, 'trading loss');
    } else if (usdBaycValue < Math.abs(userPartialvUsdBalance)) {
      const pnl = UnsignedInt(Math.abs(userPartialvUsdBalance) - usdBaycValue);
      this.addUserCollateral(userId, pnl, 'trading profit');
    }

    // TODO: add virtual collateral

    this.virtualBalances[userId].uservBaycBalance += _assetSize;
    this.virtualBalances[userId].uservUsdBalance -= Math.abs(userPartialvUsdBalance);

    const fee = UnsignedInt(usdBaycValue * SWAP_FEE);
    this.withdrawCollateralByFee(userId, fee);

    this.poolState = this.removeBaycBalance(_assetSize);
  }

  Pool.collateralCheck = function () {
    for (let i = 0; i < this.userCount; i++) {
      let temp = this.userInitCollateral[i].value;
      this.logs.filter((log: LogType) => log.from === i || log.to === i)
              .forEach((log: LogType) => temp = log.from === i ? temp - log.amount : temp + log.amount);
      if (! compareResult(temp, this.collateral[i].value)) return false;
    }

    const init = this.userInitCollateral.map((v: UnsignedIntType) => v.value).reduce((a: number, b: number) => a + b, 0);
    const last = this.collateral.reduce((a: UnsignedIntType, b: UnsignedIntType) => a.value + b.value, 0) + this.virtualCollateral;

    return compareResult(init, last);
  }


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
  Pool.testReport = function () {
    let report = "";
    for (let i = 0; i < this.userCount; i++) {
      report += `User${i}: `;
      report += this.userInitCollateral[i].value + '(init)';
      report += this.logs.filter((log: LogType) => log.from === i || log.to === i)
              .map((v: LogType) => ` ${v.from == i ? '-' : '+'} ${v.amount}${v.desc ? `(${v.desc})` : ''}`)
              .join('');
      report += ' = ' + this.collateral[i].value;
      report += '\n';
    }

    report += 'Contract: 0';
    report += this.logs.filter((log: LogType) => log.from === -1 || log.to === -1)
            .map((v: LogType) => ` ${v.from == -1 ? '-' : '+'} ${v.amount}${v.desc ? `(${v.desc})` : ''}`)
            .join('');
    report += ' = ' + this.virtualCollateral;
    report += '\n';

    report += `${this.userInitCollateral.map((v: UnsignedIntType) => v.value).join(' + ')} = ${this.userInitCollateral.reduce((a: number, b: UnsignedIntType) => a + b.value, 0)}\n`;
    report += `${this.collateral.map((v: UnsignedIntType) => v.value).join(' + ')} + ${this.virtualCollateral} = ${this.collateral.reduce((a: number, b: UnsignedIntType) => a + b.value, 0) + this.virtualCollateral}\n`;

    return report;
  }

  Pool.printCurrentStatus = function() {
    const result = [];
    for (let i = 0; i < this.userCount; i++) {
      const status = this.getUserStatus(i, this.poolState);
      result.push({
        Id: 'User' + i,
        Collateral: roundDecimal(status.collateral),
        AccountValue: roundDecimal(status.accountValue),
        NotionalValue: roundDecimal(status.notionalValue),
        PNL: roundDecimal(status.pnl),
        Margin: roundDecimal(status.margin),
        VirtuaUsdBalance: roundDecimal(status.vUsdBalance),
        VirtuaBaycBalance: roundDecimal(status.vBaycBalance),
      });
    }
    
    result.push({
      Id: 'Contract',
      Collateral: roundDecimal(this.virtualCollateral)
    })
    console.log(this.price);
    console.table(result);
  }

  return Pool;
}