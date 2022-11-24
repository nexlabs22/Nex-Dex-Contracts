import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { compareResult, roundDecimal } from "./basics";

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
  baycSize: number;
  usdSize: number;
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

  Pool.vBaycPoolSize = poolsize;
  Pool.vUsdPoolSize = price * poolsize;

  Pool.userInitCollateral = [] as Array<Number>;
  Pool.userCollateral = [] as Array<Number>;
  Pool.userUsdBalance = [] as Array<Number>;
  Pool.userBaycBalance = [] as Array<Number>;
  Pool.userAccounts = [] as Array<SignerWithAddress>;
  Pool.userCount = 0;
  Pool.logs = [] as Array<LogType>;
  Pool.vault = 0;

  Pool.exchangeContract = exchangeContract;
  Pool.usdcContract = usdcContract;

  Object.defineProperty(Pool, 'price', {
    get: function () {
      return this.vUsdPoolSize / this.vBaycPoolSize;
    }
  });

  Pool.addUser = function (address: SignerWithAddress, collateral: number) {
    this.userCount++;
    this.userAccounts.push(address);
    this.userCollateral.push(collateral);
    this.userInitCollateral.push(collateral);
    this.userBaycBalance.push(0);
    this.userUsdBalance.push(0);
  };

  Pool.userDetail = function () {
    return this.userAccounts.map((_: SignerWithAddress, i: number) => ({
      account: this.userAccounts[i],
      vUsdBalance: this.userUsdBalance[i],
      vBaycBalance: this.userBaycBalance[i],
      collateral: this.userCollateral[i]
    }))
  }

  Object.defineProperty(Pool, 'poolState', {
    get: function () {
      return {
        baycSize: this.vBaycPoolSize,
        usdSize: this.vUsdPoolSize,
      }
    },
    set: function ({ baycSize, usdSize }: PoolType) {
      this.vBaycPoolSize = baycSize;
      this.vUsdPoolSize = usdSize;
    }
  });

  Pool.openLongPosition = function (usdAmount: number) {
    const k = this.vBaycPoolSize * this.vUsdPoolSize;
    const newvUsdPoolSize = this.vUsdPoolSize + usdAmount;
    const newvBaycPoolSize = k / newvUsdPoolSize;

    return {
      baycSize: newvBaycPoolSize,
      usdSize: newvUsdPoolSize,
    }
  }

  Pool.openShortPosition = function (usdAmount: number) {
    return this.openLongPosition(-usdAmount);
  }

  Pool.updateUserBalance = function (userId: number, { baycSize, usdSize }: PoolType) {
    if (userId >= this.userCount) return;

    this.userUsdBalance[userId] += usdSize;
    this.userBaycBalance[userId] += baycSize;
  }

  Pool.getUserCollateral = function (userId: number) {
    if (userId >= this.userCount) return;

    return this.userCollateral[userId];
  }

  Pool.updateUserCollateral = function (userId: number, amount: number, desc = '') {
    if (userId >= this.userCount) return;

    this.userCollateral[userId] -= amount;
    this.vault += amount;

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

  Pool.account = function (userId: number) {
    if (userId >= this.userCount) return null;

    return this.userAccounts[userId];
  }

  Pool.getUserUsdvBalance = function (userId: number) {
    if (userId >= this.userCount) return null;

    return this.userUsdBalance[userId];
  }
    
  Pool.getUserBaycvBalance = function (userId: number) {
    if (userId >= this.userCount) return null;

    return this.userBaycBalance[userId];
  }

  Pool.getLongVusdAmountOut = function (baycAmount: number, { usdSize, baycSize }: PoolType) {
    const K = usdSize * baycSize;
    return K / (baycSize - baycAmount) - usdSize;
  }

  Pool.getShortVusdAmountOut = function (baycAmount: number, { usdSize, baycSize }: PoolType) {
    const K = usdSize * baycSize;
    return usdSize - K / (baycSize + baycAmount);
  }

  Pool.getVusdAmountOut = function (baycAmount: number, poolState: PoolType) {
    if (baycAmount > 0)      return this.getShortVusdAmountOut(baycAmount, poolState);
    else if (baycAmount < 0) return this.getLongVusdAmountOut(Math.abs(baycAmount), poolState);
    return 0;
  }

  Pool.getNotionalValue = function (userId: number, poolState: PoolType) {
    if (userId >= this.userCount) return;

    const baycBalance = this.userBaycBalance[userId];
    
    return this.getVusdAmountOut(baycBalance, poolState);
  }

  Pool.getPNL = function (userId: number, poolState: PoolType) {
    if (userId >= this.userCount) return;

    const notionalValue = this.getNotionalValue(userId, poolState);
    const usdBalance = this.userUsdBalance[userId];
    const baycBalance = this.userBaycBalance[userId];

    let pnl = 0;
    if (baycBalance > 0)      pnl = notionalValue + usdBalance;
    else if (baycBalance < 0) pnl = usdBalance - notionalValue;

    return pnl;
  }

  Pool.getAccountValue = function (userId: number, poolState: PoolType) {
    if (userId >= this.userCount) return;

    const pnl = this.getPNL(userId, poolState);
    const baycBalance = this.userBaycBalance[userId];
    const collateral = this.userCollateral[userId];

    let accountValue = collateral;
    // TODO: add virtual collateral
    if (baycBalance != 0) accountValue = collateral + pnl;

    return accountValue;
  }

  Pool.getMargin = function (userId: number, poolState: PoolType) {
    if (userId >= this.userCount) return;

    const accountValue = this.getAccountValue(userId, poolState);
    const notionalValue = this.getNotionalValue(userId, poolState);
    const baycBalance = this.userBaycBalance[userId];

    let margin = 0;
    if (baycBalance != 0) margin = accountValue / notionalValue * 100.0;

    return margin;
  }

  Pool.getUserStatus = function (userId: number, poolState: PoolType) {
    if (userId >= this.userCount) return;

    const collateral        = this.userCollateral[userId];
    const usdBalance        = this.userUsdBalance[userId];
    const baycBalance       = this.userBaycBalance[userId];
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

  Pool.isPartialLiquidateable = function (userId: number, poolState: PoolType) {
    if (userId >= this.userCount) return;
    const margin = Math.floor(this.getUserStatus(userId, poolState).margin) / 100;

    if (ATUO_CLOSE_MARGIN <= margin && margin <= MAINTENANCE_MARGIN) return true;
    return false;
  }

  Pool.isHardLiquidateable = function (userId: number, poolState: PoolType) {
    if (userId >= this.userCount) return;
    const margin = Math.floor(this.getUserStatus(userId, poolState).margin) / 100;

    if (margin != 0 && margin <= ATUO_CLOSE_MARGIN) return true;
    return false;
  }

  Pool.calculatePartialLiquidateValue = function(userId: number, poolState: PoolType) {
    const accountValue = this.getAccountValue(userId, poolState);
    const notionalValue = this.getNotionalValue(userId, poolState);

    const _accountValue = Math.abs(accountValue);
    const _notionalValue = notionalValue * SAFE_MARGIN;

    // TODO: we can make it simple
    const numerator = _notionalValue >_accountValue ? _notionalValue - _accountValue : _accountValue - _notionalValue;
    const denominator = SAFE_MARGIN - DISCOUNT_RATE;
    const x = numerator / denominator;
    return x;
  }

  Pool.partialLiquidate = function (userId: number, poolState: PoolType) {
    const liquidateAmount = this.calculatePartialLiquidateValue(userId, poolState);
    const baycLiquidateAmount = liquidateAmount * this.vBaycPoolSize / this.vUsdPoolSize;

    const userUsdBalance = this.userUsdBalance[userId];
    const userBaycBalance = this.userBaycBalance[userId];
    if (userBaycBalance > 0) {
      const usdBaycValue = this.getVusdAmountOut(baycLiquidateAmount, this.poolState);
      const userPartialvUsdBalance = userUsdBalance * baycLiquidateAmount / userBaycBalance;

      if (usdBaycValue > Math.abs(userPartialvUsdBalance)) {
        const pnl = usdBaycValue - Math.abs(userPartialvUsdBalance);
        this.updateUserCollateral(userId, -pnl, 'trading profit');
      } else if (usdBaycValue < Math.abs(userPartialvUsdBalance)) {
        const pnl = Math.abs(userPartialvUsdBalance) - usdBaycValue;
        this.updateUserCollateral(userId, pnl, 'trading loss');
      }

      // TODO: realize funding reward of user
      this.updateUserBalance(userId, {
        baycSize: -baycLiquidateAmount,
        usdSize: Math.abs(userPartialvUsdBalance)
      });

      const K = this.vBaycPoolSize * this.vUsdPoolSize;
      this.vBaycPoolSize += baycLiquidateAmount;
      this.vUsdPoolSize = K / this.vBaycPoolSize;
    }
    else if (userBaycBalance < 0) {
      // TODO: complete this part
    }
    const discountAmount = liquidateAmount * DISCOUNT_RATE;
    this.updateUserCollateral(userId, discountAmount, 'discount fee');
  }

  // TODO: We don't need new pool size information in this function
  Pool.hardLiquidate = function (userId: number, poolState: PoolType) {
    const userUsdBalance = this.userUsdBalance[userId];
    const userBaycBalance = this.userBaycBalance[userId];
    if (userBaycBalance > 0) {
      const usdBaycValue = this.getVusdAmountOut(userBaycBalance, this.poolState);

      if (usdBaycValue > Math.abs(userUsdBalance)) {
        const pnl = usdBaycValue - Math.abs(userUsdBalance);
        this.updateUserCollateral(userId, -pnl, 'trading profit');
      } else if (usdBaycValue < Math.abs(userUsdBalance)) {
        const pnl = Math.abs(userUsdBalance) - usdBaycValue;
        this.updateUserCollateral(userId, pnl, 'trading loss');
      }

      // TODO: realize funding reward of user
      this.updateUserBalance(userId, {
        baycSize: -userBaycBalance,
        usdSize: -userUsdBalance
      });

      const K = this.vBaycPoolSize * this.vUsdPoolSize;
      this.vBaycPoolSize += userBaycBalance;
      this.vUsdPoolSize = K / this.vBaycPoolSize;
    }
    else if (userBaycBalance < 0) {
      const _assetSize = Math.abs(userBaycBalance);
      const usdBaycValue = this.getVusdAmountOut(_assetSize, this.poolState);

      if (usdBaycValue > userUsdBalance) {
        const pnl = usdBaycValue - userUsdBalance;
        this.updateUserCollateral(userId, pnl, 'trading loss');
      } else if (usdBaycValue < Math.abs(userUsdBalance)) {
        const pnl = userUsdBalance - usdBaycValue;
        this.updateUserCollateral(userId, -pnl, 'trading profit');
      }

      // TODO: realize funding reward of user
      this.updateUserBalance(userId, {
        baycSize: -userBaycBalance,
        usdSize: -userUsdBalance
      });

      const K = this.vBaycPoolSize * this.vUsdPoolSize;
      this.vBaycPoolSize += userBaycBalance;
      this.vUsdPoolSize = K / this.vBaycPoolSize;
    }
    const discountAmount = this.userCollateral[userId] * DISCOUNT_RATE;
    this.updateUserCollateral(userId, discountAmount, 'discount fee');
  }

  Pool.closePosition = function (baycAmount: number) {
    const k = this.vBaycPoolSize * this.vUsdPoolSize;
    const newvBaycPoolSize = this.vBaycPoolSize + baycAmount;
    const newvUsdPoolSize = k / newvBaycPoolSize;

    return {
      baycSize: newvBaycPoolSize,
      usdSize: newvUsdPoolSize,
    }
  }

  Pool.collateralCheck = function () {
    for (let i = 0; i < this.userCount; i++) {
      let temp = this.userInitCollateral[i];
      this.logs.filter((log: LogType) => log.from === i || log.to === i)
              .forEach((log: LogType) => temp = log.from === i ? temp - log.amount : temp + log.amount);
      if (! compareResult(temp, this.userCollateral[i])) return false;
    }

    const init = this.userInitCollateral.reduce((a: number, b: number) => a + b, 0);
    const last = this.userCollateral.reduce((a: number, b: number) => a + b, 0) + this.vault;

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
      report += this.userInitCollateral[i] + '(init)';
      report += this.logs.filter((log: LogType) => log.from === i || log.to === i)
              .map((v: LogType) => ` ${v.from == i ? '-' : '+'} ${v.amount}${v.desc ? `(${v.desc})` : ''}`)
              .join('');
      report += ' = ' + this.userCollateral[i];
      report += '\n';
    }

    report += 'Contract: 0';
    report += this.logs.filter((log: LogType) => log.from === -1 || log.to === -1)
            .map((v: LogType) => ` ${v.from == -1 ? '-' : '+'} ${v.amount}${v.desc ? `(${v.desc})` : ''}`)
            .join('');
    report += ' = ' + this.vault;
    report += '\n';

    report += `${this.userInitCollateral.join(' + ')} = ${this.userInitCollateral.reduce((a: number, b: number) => a + b, 0)}\n`;
    report += `${this.userCollateral.join(' + ')} + ${this.vault} = ${this.userCollateral.reduce((a: number, b: number) => a + b, 0) + this.vault}\n`;

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
      Collateral: roundDecimal(this.vault)
    })
    console.table(result);
  }

  return Pool;
}