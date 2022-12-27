import { 
  address, int256, uint256, SafeERC20, IERC20
} from "../../solidity";
import  { Require } from '../../basics';


interface Pool {
  vBaycPoolSize: uint256;
  vUsdPoolSize: uint256;
}

interface VirtualBalance {
  virtualCollateral: int256;
  uservUsdBalance: int256;
  uservBaycBalance: uint256;
}

interface AddressToUint256 {
  [index: string]: uint256;
}

interface AddressToAddressToUint256 {
  [index: string]: AddressToUint256;
}

interface AddressToVirtualBalance {
  [index: string]: uint256;
}

// TODO: add msg.sender feature
const msg = {
  sender: ''
}

function Owner() {
  return '123';
}

export default function(contract: any) {

  contract.usdc = address(0);

  contract.poolInitialized = Boolean(false); // is pool initialized

  contract.insuranceFunds = uint256(0);

  contract.discountRate = uint256(20); //20%
  contract.saveLevelMargin = uint256(60); //60%
  contract.maintenanceMargin = uint256(50); //50%
  contract.AutoCloseMargin = uint256(40); //40%

  contract.this.swapFee = uint256(10); //=> 10/10000 = 0.1%
  contract.latestFeeUpdate = uint256(0);

  contract.liquidateList = [] as Array<string>;
  contract.pool = {
    vBaycPoolSize: uint256(0),
    vUsdPoolSize: uint256(0),
  } as Pool;

  contract.activeUsers = [] as Array<address>;

  contract.collateral = {} as AddressToAddressToUint256; //this.collateral[tokenaddress][useraddress]
  contract.virtualBalances = {} as AddressToVirtualBalance;

  // event NewOracle(address oracle);
  // event Deposit(address token, address user, uint256 amount, uint256 balance);
  // event Withdraw(address token, address user, uint256 amount, uint256 balance);

  contract.constructor = function(
    _nftOracleAddress: string,
    _priceFeed: string,
    _usdc: string
  ) {
    // nftFloorPriceFeed = AggregatorV3Interface(_nftOracleAddress);
    // priceFeed = AggregatorV3Interface(_priceFeed);
    this.usdc = _usdc;
  }

  //return bayc virtual pool size of the market
  contract.vBaycPoolSize = function(): uint256 {
    return this.pool.vBaycPoolSize;
  }

  //return usd virtual pool size of the market
  contract.vUsdPoolSize = function(): uint256 {
    return this.pool.vUsdPoolSize;
  }

  //return virtual collateral of each user
  contract.virtualCollateral = function(_user: string): int256 {
    return this.virtualBalances[_user].virtualCollateral;
  }

  //return virtual usd balance of each user
  contract.uservUsdBalance = function(_user: string): int256 {
    return this.virtualBalances[_user].uservUsdBalance;
  }

  //return virtual bayc balance of each user
  contract.uservBaycBalance = function(_user: string): int256 {
    return this.virtualBalances[_user].uservBaycBalance;
  }

  //get nft Price in ETH
  contract.showPriceETH = function(): uint256 {
    const nftPrice: int256 = this.getLatestNftPrice();
    return uint256(nftPrice);
  }

  //get nft price in USD
  contract.showPriceUSD = function(): uint256 {
    const price: uint256 = this.showPriceETH();
    const ethPrice: int256 = this.getEthUsdPrice().multipliedBy(1e10);
    return (price.multipliedBy(uint256(ethPrice))).dividedBy(1e18);
  }

  //get eth/usd price
  contract.getEthUsdPrice = function(): int256 {
    const [
      _,
      price
     ] = this.priceFeed.latestRoundData();
    return price;
  }

  contract.getLatestNftPrice = function(): int256 {
    const [
      _,
      nftFloorPrice,
    ] = this.nftFloorPriceFeed.latestRoundData();
    return nftFloorPrice;
  }

  //check is user exist in activeUsers array
  contract.doesUserExist = function(_user: string): boolean {
    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] == _user) {
        return true;
      }
    }
    return false;
  }

  //add user to the active user list (first check if its not)
  contract._addActiveUser = function(_user: string) {
    const isExist: boolean = this.doesUserExist(_user);
    if (isExist == false) {
      this.activeUsers.push(_user);
    }
  }

  //remove user from active users list
  contract._removeActiveUser = function(_user: string) {
    const isExist: boolean = this.doesUserExist(_user);
    if (isExist == true) {
      for (let i = 0; i < this.activeUsers.length; i++) {
        if (this.activeUsers[i] == _user) {
          delete this.activeUsers[i];
        }
      }
    }
  }

  //return all active users in one array
  contract.getAllActiveUsers = function(): Array<string> {
    return this.activeUsers;
  }

  //create the pool
  //for this time owner can do it
  contract.initialVirtualPool = function(_assetSize: uint256) {
    Require(this.poolInitialized == false, "You cannot initialize pool again");
    const oraclePrice: uint256 = this.showPriceUSD();
    this.pool.vBaycPoolSize = _assetSize;
    this.pool.vUsdPoolSize = (_assetSize.multipliedBy(oraclePrice)).dividedBy(1e18);
    this.poolInitialized = true;
  }

  contract.changeNftOracleAddress = function(_newAddress: string) {
    // this.nftFloorPriceFeed = AggregatorV3Interface(_newAddress);
  }

  //Notice: newFee should be between 1 to 500 (0.01% - 5%)
  contract.setthis.swapFee = function(_newFee: uint256) {
    // TODO: block.timestamp
    // const distance: uint256 = block.timestamp - this.latestFeeUpdate;
    // Require(distance / 60 / 60 > 12, "You should wait at least 12 hours after the latest update");
    // Require(_newFee.lte(500) && _newFee.gte(1), "The newFee should be between 1 and 500 (0.01% - 5%)");
    // this.swapFee = _newFee;
    // this.latestFeeUpdate = block.timestamp;
  }

  //deposit collateral
  contract.depositCollateral = function(_amount: uint256) {
    // TODO: msg.sender
    // SafeERC20.safeTransferFrom(IERC20(this.usdc), msg.sender, address(0), _amount);
    // this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].add(_amount);
    // emit Deposit(usdc, msg.sender, _amount, this.collateral[usdc][msg.sender]);
  }

  //withdraw collateral
  //befor that the contract.check user margin
  contract.withdrawCollateral = function(_amount: uint256) {
    //check new margin
    // TODO: msg.sender
    // const totalPositionNotional: uint256 = this.getPositionNotional(msg.sender);
    // const totalAccountValue: int256 = this.getAccountValue(msg.sender);
    // if (totalPositionNotional.gt(0)) {
    //   const newAccountValue: int256 = totalAccountValue.minus(int256(_amount));
    //   const newMargin: int256 = (newAccountValue.multipliedBy(100)).dividedBy(int256(totalPositionNotional));
    //   Require(
    //     newMargin.gt(int256(this.saveLevelMargin)),
    //     "You cannot withdraw because your margin is lower than the saveMargin level"
    //   );
    // }
    //check user has enough collateral
    // TODO: msg.sender
    // Require(
    //   this.collateral[this.usdc][msg.sender] >= _amount,
    //   "Requested withdrawal amount is larger than the collateral balance."
    // );
    //transfer tokens to the user

    // TODO: msg.sender
    // SafeERC20.safeTransfer(IERC20(this.usdc), msg.sender, _amount);
    // this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].sub(_amount);
    // emit Withdraw(usdc, msg.sender, _amount, this.collateral[usdc][msg.sender]);
  }

  //give the user funding reward when position will be closed
  contract._realizevirtualCollateral = function(_user: string, _amount: int256) {
    Require(
      _amount.lte(this.absoluteInt(this.virtualBalances[_user].virtualCollateral)),
      "Requested amount is larger than the virtual collateral balance."
    );
    if (this.virtualBalances[_user].virtualCollateral.gt(0)) {
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(uint256(_amount));
      this.virtualBalances[_user].virtualCollateral = this.virtualBalances[_user].virtualCollateral.minus(_amount);
    } else if (this.virtualBalances[_user].virtualCollateral.lt(0)) {
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(uint256(_amount));
      this.virtualBalances[_user].virtualCollateral = this.virtualBalances[_user].virtualCollateral.plus(_amount);
    }
  }

  //get output Bayc by usd input amount if we want to buy(long)
  //how much Bayc we will get by paying usd for long
  contract.getLongBaycAmountOut = function(_vUsdAmount: uint256): uint256 {
    const k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    const newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.plus(_vUsdAmount);
    const newvBaycPoolSize: uint256 = k.dividedBy(newvUsdPoolSize);
    const userBayc: uint256 = this.pool.vBaycPoolSize.minus(newvBaycPoolSize);
    return userBayc;
  }

  //get output usd amount by Bayc input amount if we want to buy(long)
  contract.getLongVusdAmountOut = function(_vBaycAmount: uint256): uint256 {
    const k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    const newvBaycPoolSize: uint256 = this.pool.vBaycPoolSize.minus(_vBaycAmount);
    const newvUsdPoolSize: uint256 = k.dividedBy(newvBaycPoolSize);
    const uservUsd: uint256 = newvUsdPoolSize.minus(this.pool.vUsdPoolSize);
    return uservUsd;
  }

  //get output Bayc by usd input amount if we want to sell(short)
  contract.getShortBaycAmountOut = function(_vUsdAmount: uint256): uint256 {
    const k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    const newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.minus(_vUsdAmount);
    const newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
    const userBayc: uint256 = newvBaycPoolSize.minus(this.pool.vBaycPoolSize);
    return userBayc;
  }

  //get output usd by Bayc input amount if we want to sell(short)
  contract.getShortVusdAmountOut = function(_vBaycAmount: uint256): uint256 {
    const k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    const newvBaycPoolSize: uint256 = this.pool.vBaycPoolSize.plus(_vBaycAmount);
    const newvUsdPoolSize: uint256 = k.dividedBy(newvBaycPoolSize);
    const uservUsd: uint256 = this.pool.vUsdPoolSize.minus(newvUsdPoolSize);
    return uservUsd;
  }

  //I use int for negative/positve numbers for user bayc and usd balance(wich might be negative)
  //so for some point we need to convert them to uint so they should be positive
  //f.e positive(-1)=1
  contract.positive = function(_amount: int256): uint256 {
    if (_amount.lt(0)) {
      const posAmount: int256 = _amount.negated();
      return uint256(posAmount);
    } else {
      return uint256(_amount);
    }
  }

  contract.oraclePrice = function(): uint256 {
    const oraclePrice: uint256 = this.showPriceUSD();
    return oraclePrice;
  }

  contract.getCurrentExchangePrice = function(): uint256 {
    return (this.pool.vUsdPoolSize.multipliedBy(1e18)).dividedBy(this.pool.vBaycPoolSize);
  }

  contract.openLongPosition = function(_usdAmount: uint256, _minimumBaycAmountOut: uint256): void {
    //calculate the new pool size and user bayc amount
    let k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.plus(_usdAmount);
    let newvBaycPoolSize: uint256 = k.dividedBy(newvUsdPoolSize);
    /*
    bool isInTheRightRange = isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    require(
      isInTheRightRange == true,
      "You can't move the price more than 10% away from the oracle price."
    );
    */
    const isNewMarginHardLiquidatable: boolean = this._isNewMarginLiquidatable(
      msg.sender,
      _usdAmount,
      newvBaycPoolSize,
      newvUsdPoolSize
    );
    Require(
      isNewMarginHardLiquidatable == false,
      "Insufficient margin to open position with requested size."
    );

    //first we run liquidation functions
    [newvBaycPoolSize, newvUsdPoolSize] = this._hardLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);
    [newvBaycPoolSize, newvUsdPoolSize] = this._partialLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);

    k = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    newvUsdPoolSize = this.pool.vUsdPoolSize.plus(_usdAmount);
    newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
    const userBayc:uint256 = this.pool.vBaycPoolSize.minus(newvBaycPoolSize);
    Require(userBayc.gte(_minimumBaycAmountOut), "INSUFFICIENT_OUTPUT_AMOUNT");
    //update bayc and usd balance of user
    this.virtualBalances[msg.sender].uservBaycBalance = this.virtualBalances[msg.sender].uservBaycBalance.plus(int256(userBayc));
    this.virtualBalances[msg.sender].uservUsdBalance = this.virtualBalances[msg.sender].uservUsdBalance.minus(int256(_usdAmount));

    //add user to the active user list
    this._addActiveUser(msg.sender);

    //trade fee
    const fee: uint256 = (_usdAmount.multipliedBy(this.swapFee)).dividedBy(10000);
    this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].minus(fee);
    const owner: address = Owner();
    SafeERC20.safeTransfer(IERC20(this.usdc), owner, fee);

    //update pool
    this.pool.vBaycPoolSize = newvBaycPoolSize;
    this.pool.vUsdPoolSize = newvUsdPoolSize;
  }

  contract.openShortPosition = function(_usdAmount: uint256, _minimumBaycAmountOut: uint256) {
    //calculate the new pool size and user bayc amount
    let k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.minus(_usdAmount);
    let newvBaycPoolSize: uint256 = k.dividedBy(newvUsdPoolSize);
    /*
    bool isInTheRightRange = isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    require(
      isInTheRightRange == true,
      "You can't move the price more than 10% away from the oracle price."
    );
    */
    const isNewMarginHardLiquidatable: boolean = this._isNewMarginLiquidatable(
      msg.sender,
      _usdAmount,
      newvBaycPoolSize,
      newvUsdPoolSize
    );
    Require(
      isNewMarginHardLiquidatable == false,
      "Insufficient margin to open position with requested size."
    );

    //first we run liquidation functions
    [newvBaycPoolSize, newvUsdPoolSize] = this._hardLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);
    [newvBaycPoolSize, newvUsdPoolSize] = this._partialLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);

    k = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    newvUsdPoolSize = this.pool.vUsdPoolSize.minus(_usdAmount);
    newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
    const userBayc: uint256 = newvBaycPoolSize.minus(this.pool.vBaycPoolSize);
    Require(userBayc.gte(_minimumBaycAmountOut), "INSUFFICIENT_OUTPUT_AMOUNT");
    //update bayc and usd balance of user
    this.virtualBalances[msg.sender].uservBaycBalance = this.virtualBalances[msg.sender].uservBaycBalance.minus(int256(userBayc));
    this.virtualBalances[msg.sender].uservUsdBalance = this.virtualBalances[msg.sender].uservUsdBalance.plus(int256(_usdAmount));

    //add user to the active user list
    this._addActiveUser(msg.sender);

    //trade fee
    const fee: uint256 = (_usdAmount.multipliedBy(this.swapFee)).dividedBy(10000);
    this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].minus(fee);
    const owner: address = Owner();
    SafeERC20.safeTransfer(IERC20(this.usdc), owner, fee);

    //update pool
    this.pool.vBaycPoolSize = newvBaycPoolSize;
    this.pool.vUsdPoolSize = newvUsdPoolSize;
  }

  contract._closeLongPosition = function(_user: string, _assetSize: uint256, _minimumUsdOut: uint256) {
    Require(
      _assetSize.lte(this.positive(this.virtualBalances[_user].uservBaycBalance)),
      "Reduce only order can only close long size equal or less than the outstanding asset size."
    );

    let k: uint256;
    //first we run liquidation functions
    k = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let vBaycNewPoolSize: uint256 = this.pool.vBaycPoolSiz.plus(_assetSize);
    let vUsdNewPoolSize: uint256 = k.dividedBy(vBaycNewPoolSize);

    //liquidate users
    [vBaycNewPoolSize, vUsdNewPoolSize] = this._hardLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);
    [vBaycNewPoolSize, vUsdNewPoolSize] = this._partialLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);

    //get the output usd of closing position
    //f.e 1Bayc -> 2000$
    const usdBaycValue: uint256 = this.getShortVusdAmountOut(_assetSize);
    Require(usdBaycValue.gte(_minimumUsdOut), "INSUFFICIENT_OUTPUT_AMOUNT");
    const userPartialvUsdBalance: int256 = (this.virtualBalances[_user].uservUsdBalance.multipliedBy(int256(_assetSize))).dividedBy(
      this.virtualBalances[_user].uservBaycBalance);

    //increase or decrease the user pnl for this function
    if (usdBaycValue.gt(uint256(this.positive(userPartialvUsdBalance)))) {
      const pnl: uint256 = usdBaycValue.minus(uint256(this.positive(userPartialvUsdBalance)));
      // this.collateral[usdc][_user] += pnl;
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
    } else if (usdBaycValue.lt(uint256(this.positive(userPartialvUsdBalance)))) {
      const pnl: uint256 = uint256(this.positive(userPartialvUsdBalance).minus(usdBaycValue));
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
    }
    //realize funding reward of user;
    const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
    if (!realizeVirtualCollAmount.eq(0)) {
      this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
    }
    //update user balance
    this.virtualBalances[_user].uservBaycBalance = this.virtualBalances[_user].uservBaycBalance.minus(int256(_assetSize));
    this.virtualBalances[_user].uservUsdBalance = this.virtualBalances[_user].uservUsdBalance.plus(this.absoluteInt(userPartialvUsdBalance));
    // if user has not vbalance so he is not active
    if (
      this.virtualBalances[_user].uservBaycBalance.eq(0) && this.virtualBalances[_user].uservUsdBalance.eq(0)
    ) {
      this._removeActiveUser(_user);
    }

    //trade fee
    const fee: uint256 = (usdBaycValue.multipliedBy(this.swapFee)).dividedBy(10000);
    this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(fee);
    const owner: address = Owner();
    SafeERC20.safeTransfer(IERC20(this.usdc), owner, fee);

    //update the pool
    k = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    this.pool.vBaycPoolSize = this.pool.vBaycPoolSize.plus(_assetSize);
    this.pool.vUsdPoolSize = k.dividedBy(this.pool.vBaycPoolSize);
  }

  contract._closeShortPosition = function(_user: string, _assetSize: uint256, _minimumUsdOut: uint256): void {
    Require(
      _assetSize.lte(this.positive(this.virtualBalances[_user].uservBaycBalance)),
      "Reduce only order can only close short size equal or less than the outstanding asset size."
    );

    let k: uint256;
    //first we run liquidation functions
    k = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let vBaycNewPoolSize: uint256 = this.pool.vBaycPoolSize.minus(_assetSize);
    let vUsdNewPoolSize: uint256 = k.dividedBy(vBaycNewPoolSize);


    //liquidate users
    [vBaycNewPoolSize, vUsdNewPoolSize] = this._hardLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);
    [vBaycNewPoolSize, vUsdNewPoolSize] = this._partialLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);
    //get the output usd of closing position
    const usdBaycValue: uint256 = this.getLongVusdAmountOut(_assetSize);
    Require(usdBaycValue.gte(_minimumUsdOut), "INSUFFICIENT_OUTPUT_AMOUNT");

    const userPartialvUsdBalance: int256 = (this.virtualBalances[_user].uservUsdBalance.multipliedBy(int256(_assetSize))).dividedBy(
      this.virtualBalances[_user].uservBaycBalance);
    //increase or decrease pnl of the user
    if (usdBaycValue.gt(uint256(this.positive(userPartialvUsdBalance)))) {
      const pnl: uint256 = usdBaycValue.minus(uint256(this.positive(userPartialvUsdBalance)));
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
    }
    if (usdBaycValue.lt(uint256(this.positive(userPartialvUsdBalance)))) {
      const pnl: uint256 = uint256(this.positive(userPartialvUsdBalance).minus(usdBaycValue));
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
    }
    //realize funding reward of user;
    const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
    if (!realizeVirtualCollAmount.eq(0)) {
      this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
    }
    //update user balance
    this.virtualBalances[_user].uservBaycBalance = this.virtualBalances[_user].uservBaycBalance.plus(int256(_assetSize));
    this.virtualBalances[_user].uservUsdBalance = this.virtualBalances[_user].uservUsdBalance.minus(this.absoluteInt(userPartialvUsdBalance));
    // if user has not vbalance so he is not active
    if (
      this.virtualBalances[_user].uservBaycBalance.eq(0) && this.virtualBalances[_user].uservUsdBalance.eq(0)
    ) {
      this._removeActiveUser(_user);
    }
    //trade fee
    const fee: uint256 = (usdBaycValue.multipliedBy(this.swapFee)).dividedBy(10000);
    this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(fee);
    const owner: address = Owner();
    SafeERC20.safeTransfer(IERC20(this.usdc), owner, fee);
    //update pool
    k = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    this.pool.vBaycPoolSize = this.pool.vBaycPoolSize.minus(_assetSize);
    this.pool.vUsdPoolSize = k.dividedBy(this.pool.vBaycPoolSize);
  }

  contract.closePositionComplete = function(_minimumUsdOut: uint256): void {
    const assetSize: uint256 = this.positive(this.virtualBalances[msg.sender].uservBaycBalance);
    this.closePosition(assetSize, _minimumUsdOut);
  }

  contract.closePosition = function(_assetSize: uint256, _minimumUsdOut: uint256): void {
    Require(
      _assetSize.lte(this.positive(this.virtualBalances[msg.sender].uservBaycBalance)),
      "Reduce only order can only close size equal or less than the outstanding asset size."
    );
    //if user has positive vBayc balance so he/she has longPosition
    //if user has negative vBayc balance so he/she has shortPosition
    if (this.virtualBalances[msg.sender].uservBaycBalance.gt(0)) {
      this._closeLongPosition(msg.sender, _assetSize, _minimumUsdOut);
    } else if (this.virtualBalances[msg.sender].uservBaycBalance.lt(0)) {
      this._closeShortPosition(msg.sender, _assetSize, _minimumUsdOut);
    }
  }

  //return the pnl of user
  /*
  user vBayc balance = 2Bayc
  user vUsd balance = -3000
  currnent 2 vBayc value =  4000
  user pnl = 4000 - positive(-3000) = 1000$
  */
  contract.getPNL = function(_user: string): int256 {
    let pnl: int256;
    if (this.virtualBalances[_user].uservBaycBalance.gt(0)) {
      const currentBaycValue: uint256 = this.getShortVusdAmountOut(
        uint256(this.virtualBalances[_user].uservBaycBalance)
      );
      pnl = int256(currentBaycValue).plus(this.virtualBalances[_user].uservUsdBalance);
    } else if (this.virtualBalances[_user].uservBaycBalance.lt(0)) {
      const currentBaycValue: uint256 = this.getLongVusdAmountOut(
        this.positive(this.virtualBalances[_user].uservBaycBalance)
      );
      pnl = this.virtualBalances[_user].uservUsdBalance.minus(int256(currentBaycValue));
    } else {
      pnl = int256(0);
    }
    return pnl;
  }

  //get user pnl by new pool size(new price);
  contract._getNewPNL = function(
    _user: string,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): int256 {
    if (this.virtualBalances[_user].uservBaycBalance.gt(0)) {
      const k: uint256 = _vBaycNewPoolSize.multipliedBy(_vUsdNewPoolSize);
      const newvBaycPoolSize: uint256 = _vBaycNewPoolSize.plus(
        uint256(this.virtualBalances[_user].uservBaycBalance));
      const newvUsdPoolSize: uint256 = k.dividedBy(newvBaycPoolSize);
      const currentBaycValue: uint256 = _vUsdNewPoolSize.minus(newvUsdPoolSize);
      const pnl: int256 = int256(currentBaycValue).plus(this.virtualBalances[_user].uservUsdBalance);
      return pnl;
    } else if (this.virtualBalances[_user].uservBaycBalance.lt(0)) {
      const k: uint256 = _vBaycNewPoolSize.multipliedBy(_vUsdNewPoolSize);
      const newvBaycPoolSize: uint256 = _vBaycNewPoolSize.minus(
        this.positive(this.virtualBalances[_user].uservBaycBalance));
      const newvUsdPoolSize: uint256 = k.dividedBy(newvBaycPoolSize);
      const currentBaycValue: uint256 = newvUsdPoolSize.minus(_vUsdNewPoolSize);
      const pnl: int256 = this.virtualBalances[_user].uservUsdBalance.minus(int256(currentBaycValue));
      return pnl;
    }
    return int256(0);
  }

  //account value = collateral +- pnl
  contract.getAccountValue = function(_user: string): int256 {
    const collateralValue: uint256 = this.collateral[this.usdc][_user];
    const pnl: int256 = this.getPNL(_user);
    const fundingReward: int256 = this.virtualBalances[_user].virtualCollateral;
    const accountValue: int256 = int256(collateralValue).plus(pnl).plus(fundingReward);
    return accountValue;
  }

  //get new account value according to the new pool size (new price)
  contract._getNewAccountValue = function(
    _user: string,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): int256 {
    const collateralValue: uint256 = this.collateral[this.usdc][_user];
    const pnl: int256 = this._getNewPNL(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    const fundingReward: int256 = this.virtualBalances[_user].virtualCollateral;
    const accountValue: int256 = int256(collateralValue).plus(pnl).plus(fundingReward);
    // int256 accountValue = int256(collateralValue);
    return accountValue;
  }

  //get total position value of each user
  contract.getPositionNotional = function(_user: string): uint256 {
    if (this.virtualBalances[_user].uservBaycBalance.gt(0)) {
      const positionNotionalValue: uint256 = this.getShortVusdAmountOut(
        uint256(this.virtualBalances[_user].uservBaycBalance)
      );
      return positionNotionalValue;
    } else if (this.virtualBalances[_user].uservBaycBalance.lt(0)) {
      const positionNotionalValue: uint256 = this.getLongVusdAmountOut(
        uint256(this.absoluteInt((this.virtualBalances[_user].uservBaycBalance)))
      );
      return positionNotionalValue;
    } else {
      return uint256(0);
    }
  }

  //get new position notional value according to the new pool size (new price)
  contract._getNewPositionNotional = function(
    _user: string,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): uint256 {
    if (this.virtualBalances[_user].uservBaycBalance.gt(0)) {
      const k: uint256 = _vBaycNewPoolSize.multipliedBy(_vUsdNewPoolSize);
      const newvBaycPoolSize: uint256 = _vBaycNewPoolSize.plus(
        uint256(this.virtualBalances[_user].uservBaycBalance));
      const newvUsdPoolSize: uint256 = k.dividedBy(newvBaycPoolSize);
      const positionNotionalValue: uint256 = _vUsdNewPoolSize.minus(newvUsdPoolSize);
      return positionNotionalValue;
    } else if (this.virtualBalances[_user].uservBaycBalance.lt(0)) {
      const k: uint256 = _vBaycNewPoolSize.multipliedBy(_vUsdNewPoolSize);
      const newvBaycPoolSize: uint256 = _vBaycNewPoolSize.minus(
        this.positive(this.virtualBalances[_user].uservBaycBalance));
      const newvUsdPoolSize: uint256 = k.dividedBy(newvBaycPoolSize);
      const positionNotionalValue: uint256 = newvUsdPoolSize.minus(_vUsdNewPoolSize);
      return positionNotionalValue;
    } else {
      return uint256(0);
    }
  }

  contract.userMargin = function(_user: string): int256 {
    const accountValue: int256 = this.getAccountValue(_user);
    const positionNotional: uint256 = this.getPositionNotional(_user);
    if (!accountValue.eq(0) && positionNotional.gt(0)) {
      const margin: int256 = (accountValue.multipliedBy(100)).dividedBy(int256(positionNotional));
      return margin;
    } else {
      return int256(0);
    }
  }

  //get the new margin of user according to the new pool size (new price)
  contract._userNewMargin = function(
    _user: string,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): int256 {
    const accountValue: int256 = this._getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    const positionNotional: uint256 = this._getNewPositionNotional(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    if (!accountValue.eq(0) && positionNotional.gt(0)) {
      const margin: int256 = (accountValue.multipliedBy(100)).dividedBy(int256(positionNotional));
      return margin;
    } else {
      return int256(0);
    }
  }

  contract.isHardLiquidatable = function(_user: string): boolean {
    const userMargin: int256 = this.userMargin(_user);
    if (!userMargin.eq(0) && userMargin.lte(int256(this.AutoCloseMargin))) {
      return true;
    } else {
      return false;
    }
  }

  return contract;
}