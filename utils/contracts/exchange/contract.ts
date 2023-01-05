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
  [index: string]: VirtualBalance;
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

  contract.swapFee = uint256(10); //=> 10/10000 = 0.1%
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

  //check is user exist in this.activeUsers array
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
  contract.getAllthis.activeUsers = function(): Array<string> {
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
    SafeERC20.safeTransferFrom(IERC20(this.usdc), msg.sender, address(0), _amount);
    this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].add(_amount);
    // emit Deposit(usdc, msg.sender, _amount, this.collateral[this.usdc][msg.sender]);
  }

  //withdraw collateral
  //befor that the contract.check user margin
  contract.withdrawCollateral = function(_amount: uint256) {
    //check new margin
    const totalPositionNotional: uint256 = this.getPositionNotional(msg.sender);
    const totalAccountValue: int256 = this.getAccountValue(msg.sender);
    if (totalPositionNotional.gt(0)) {
      const newAccountValue: int256 = totalAccountValue.minus(int256(_amount));
      const newMargin: int256 = (newAccountValue.multipliedBy(100)).dividedBy(int256(totalPositionNotional));
      Require(
        newMargin.gt(int256(this.saveLevelMargin)),
        "You cannot withdraw because your margin is lower than the saveMargin level"
      );
    }
    // check user has enough collateral
    Require(
      this.collateral[this.usdc][msg.sender].gte(_amount),
      "Requested withdrawal amount is larger than the collateral balance."
    );
    // transfer tokens to the user

    SafeERC20.safeTransfer(IERC20(this.usdc), msg.sender, _amount);
    this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].sub(_amount);
    // emit Withdraw(usdc, msg.sender, _amount, this.collateral[this.usdc][msg.sender]);
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
  //f.e this.positive(-1)=1
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
      // this.collateral[this.usdc][_user] += pnl;
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
  user pnl = 4000 - this.positive(-3000) = 1000$
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


  //ckeck that is user can be liquidated according to the new price
  contract._isHardLiquidatable = function(
    _user: string,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): boolean {
    const userMargin: int256 = this._userNewMargin(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    if (!userMargin.eq(0) && userMargin.lte(int256(this.AutoCloseMargin))) {
      return true;
    } else {
      return false;
    }
  }

  contract._isNewMarginLiquidatable = function(
    _user: string,
    _usdAmount: uint256,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): boolean {
    const accountValue: int256 = this._getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    const positionNotional: uint256 = this._getNewPositionNotional(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    const newPositionNotional: uint256 = positionNotional.plus(_usdAmount);
    const newMargin: int256 = (accountValue.multipliedBy(100)).dividedBy(int256(newPositionNotional));
    if (!newMargin.eq(0) && newMargin.lte(int256(this.saveLevelMargin))) {
      return true;
    } else {
      return false;
    }
  }

  contract.isPartialLiquidatable = function(_user: string): boolean {
    const userMargin: int256 = this.userMargin(_user);
    if (int256(this.AutoCloseMargin).lte(userMargin) && userMargin.lte(int256(this.maintenanceMargin))) {
      return true;
    } else {
      return false;
    }
  }

  //ckeck that is user can be partialy liquidated according to the new price
  contract._isPartialLiquidatable = function(
    _user: string,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): boolean {
    const userMargin: int256 = this._userNewMargin(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    // if ( 40 < userMargin < 50 ) => user is partial liquidatable
    if (int256(this.AutoCloseMargin).lte(userMargin) && userMargin.lte(int256(this.maintenanceMargin))) {
      return true;
    } else {
      return false;
    }
  }

  //this contract.is called if user should be liquidated by new price
  contract._hardLiquidate = function(
    _user: string,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): Array<uint256> {
    Require(
      this._isHardLiquidatable(_user, _vBaycNewPoolSize, _vUsdNewPoolSize),
      "User is not hard liquidatable."
    );
    let vBaycNewPoolSize = _vBaycNewPoolSize;
    let vUsdNewPoolSize = _vUsdNewPoolSize;
    if (this.virtualBalances[_user].uservBaycBalance.gt(0)) {
      // _closeLongPosition(_user, uint256(uservBaycBalance[_user]));
      const _assetSize: uint256 = uint256(this.virtualBalances[_user].uservBaycBalance);
      const usdBaycValue: uint256 = this.getShortVusdAmountOut(_assetSize);
      //increase or decrease the user pnl for this function
      if (usdBaycValue.gt(this.positive(this.virtualBalances[_user].uservUsdBalance))) {
        const pnl: uint256 = usdBaycValue.minus(this.positive(this.virtualBalances[_user].uservUsdBalance));
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
      } else if (usdBaycValue.lt(this.positive(this.virtualBalances[_user].uservUsdBalance))) {
        const pnl: uint256 = this.positive(this.virtualBalances[_user].uservUsdBalance).minus(usdBaycValue);
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
      }
      //realize funding reward of user;
      const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
      if (!realizeVirtualCollAmount.eq(0)) {
        this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      this.virtualBalances[_user].uservBaycBalance = 0;
      this.virtualBalances[_user].uservUsdBalance = 0;
      // if user has not vbalance so he is not active
      this._removeActiveUser(_user);
      //update the pool
      let k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vBaycPoolSize = this.pool.vBaycPoolSize.plus(_assetSize);
      this.pool.vUsdPoolSize = k.dividedBy(this.pool.vBaycPoolSize);
      //update the new pool size
      k = vBaycNewPoolSize.multipliedBy(vUsdNewPoolSize);
      vBaycNewPoolSize = vBaycNewPoolSize.plus(_assetSize);
      vUsdNewPoolSize = k.dividedBy(vBaycNewPoolSize);
    } else if (this.virtualBalances[_user].uservBaycBalance.lt(0)) {
      const _assetSize: uint256 = this.positive(this.virtualBalances[_user].uservBaycBalance);
      const usdBaycValue: uint256 = this.getLongVusdAmountOut(_assetSize);
      //increase or decrease the user pnl for this function
      if (usdBaycValue.gt(uint256(this.virtualBalances[_user].uservUsdBalance))) {
        const pnl: uint256 = usdBaycValue.minus(this.positive(this.virtualBalances[_user].uservUsdBalance));
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
      } else if (usdBaycValue.lt(uint256(this.virtualBalances[_user].uservUsdBalance))) {
        const pnl: uint256 = this.positive(this.virtualBalances[_user].uservUsdBalance).minus(usdBaycValue);
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
      }
      //realize funding reward of user;
      const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
      if (!realizeVirtualCollAmount.eq(0)) {
        this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      this.virtualBalances[_user].uservBaycBalance = int256(0);
      this.virtualBalances[_user].uservUsdBalance = int256(0);
      // if user has not vbalance so he is not active
      this._removeActiveUser(_user);
      //update the pool
      let k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vBaycPoolSize = this.pool.vBaycPoolSize.minus(_assetSize);
      this.pool.vUsdPoolSize = k.dividedBy(this.pool.vBaycPoolSize);
      //update the new pool size
      k = vBaycNewPoolSize.multipliedBy(vUsdNewPoolSize);
      vBaycNewPoolSize = vBaycNewPoolSize.minus(_assetSize);
      vUsdNewPoolSize = k.dividedBy(vBaycNewPoolSize);
    }
    const collateralValue: uint256 = this.collateral[this.usdc][_user];
    const discountAmount: uint256 = (this.discountRate.multipliedBy(collateralValue)).dividedBy(100);
    this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(discountAmount);
    this.insuranceFunds = this.insuranceFunds.plus(discountAmount);

    return [
      vBaycNewPoolSize,
      vUsdNewPoolSize
    ];
  }

  //this contract.is called if user should be liquidated by new price
  contract._hardNegativeLiquidate = function(
    _user: string,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): Array<uint256> {
    Require(
      this._isHardLiquidatable(_user, _vBaycNewPoolSize, _vUsdNewPoolSize),
      "User is not hard liquidatable."
    );
    let vBaycNewPoolSize = _vBaycNewPoolSize;
    let vUsdNewPoolSize = _vUsdNewPoolSize;
    if (this.virtualBalances[_user].uservBaycBalance.gt(0)) {
      const _assetSize: uint256 = uint256(this.virtualBalances[_user].uservBaycBalance);
      const negativeValue: int256 = this._getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);

      this.collateral[this.usdc][_user] = uint256(0);
      this.virtualBalances[_user].virtualCollateral = int256(0);
      //update user balance
      this.virtualBalances[_user].uservBaycBalance = int256(0);
      this.virtualBalances[_user].uservUsdBalance = int256(0);
      // if user has not vbalance so he is not active
      this._removeActiveUser(_user);
      //update the pool
      const k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vBaycPoolSize = this.pool.vBaycPoolSize.plus(_assetSize);
      this.pool.vUsdPoolSize = k.dividedBy(this.pool.vBaycPoolSize);
      //update the new pool size
      vBaycNewPoolSize = vBaycNewPoolSize.plus(_assetSize);
      vUsdNewPoolSize = k.dividedBy(vBaycNewPoolSize);
      // reduce short users virtual collateral
      const allShortBaycBalance: int256 = this.getAllShortvBaycBalance();
      for (let i = 0; i < this.activeUsers.length; i++) {
        const user: string = this.activeUsers[i];
        if (this.virtualBalances[_user].uservBaycBalance.lt(0)) {
          const liquidationCover: uint256 = (uint256(negativeValue).multipliedBy(
            this.positive(this.virtualBalances[_user].uservBaycBalance))).dividedBy(this.positive(allShortBaycBalance));
          this.virtualBalances[_user].virtualCollateral = this.virtualBalances[_user].virtualCollateral.minus(int256(liquidationCover));
        }
      }
    } else if (this.virtualBalances[_user].uservBaycBalance.lt(0)) {
      const _assetSize: uint256 = uint256(this.positive(this.virtualBalances[_user].uservBaycBalance));
      const negativeValue: int256 = this._getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);

      this.collateral[this.usdc][_user] = uint256(0);
      this.virtualBalances[_user].virtualCollateral = int256(0);

      //update user balance
      this.virtualBalances[_user].uservBaycBalance = int256(0);
      this.virtualBalances[_user].uservUsdBalance = int256(0);
      // if user has not vbalance so he is not active
      this._removeActiveUser(_user);
      //update the pool
      const k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vBaycPoolSize = this.pool.vBaycPoolSize.minus(_assetSize);
      this.pool.vUsdPoolSize = k.dividedBy(this.pool.vBaycPoolSize);
      //update the new pool size
      vBaycNewPoolSize = vBaycNewPoolSize.minus(_assetSize);
      vUsdNewPoolSize = k.dividedBy(vBaycNewPoolSize);
      // reduce long users virtual collateral
      const allLongvBaycBalance: int256 = this.getAllLongvBaycBalance();
      for (let i = 0; i < this.activeUsers.length; i++) {
        const user: string = this.activeUsers[i];
        if (this.virtualBalances[_user].uservBaycBalance.gt(0)) {
          const liquidationCover: uint256 = (uint256(negativeValue).multipliedBy(
            uint256(this.virtualBalances[_user].uservBaycBalance))).dividedBy(uint256(allLongvBaycBalance));
          this.virtualBalances[_user].virtualCollateral = this.virtualBalances[_user].virtualCollateral.minus(int256(liquidationCover));
        }
      }
    }

    return [
      vBaycNewPoolSize,
      vUsdNewPoolSize
    ];
  }

  //calculate liquidation amount to turn back the user margin to the save level(60%)
  contract.calculatePartialLiquidateValue = function(_user: string): uint256 {
    const totalAccountValue: int256 = this.getAccountValue(_user);
    const totalPositionNotional: uint256 = this.getPositionNotional(_user);
    const numerator: uint256 = (totalPositionNotional.multipliedBy(this.saveLevelMargin)).dividedBy(100).minus(
      this.positive(totalAccountValue));
    const denominator: uint256 = this.saveLevelMargin.minus(this.discountRate);
    const x: uint256 = (numerator.multipliedBy(100)).dividedBy(denominator);
    return x;
  }

  //calculate liquidation amount to turn back the user margin to the save level(60%) according to the new price
  contract._calculatePartialLiquidateValue = function(
    _user: string,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): uint256 {
    const totalAccountValue: int256 = this._getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    const totalPositionNotional: uint256 = this._getNewPositionNotional(
      _user,
      _vBaycNewPoolSize,
      _vUsdNewPoolSize
    );
    const numerator: uint256 = (totalPositionNotional.multipliedBy(this.saveLevelMargin)).dividedBy(100).minus(
      this.positive(totalAccountValue));
    const denominator: uint256 = this.saveLevelMargin.minus(this.discountRate);
    const x: uint256 = (numerator.multipliedBy(100)).dividedBy(denominator);
    return x;
  }

  //get minimum long bayc amount that user receives
  contract.getMinimumLongBaycOut = function(_usdAmount: uint256): uint256 {
    let vBaycPoolSize: int256 = int256(this.pool.vBaycPoolSize);
    let vUsdPoolSize: int256 = int256(this.pool.vUsdPoolSize);
    let k: int256 = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    let newvUsdPoolSize: int256 = vUsdPoolSize.plus(int256(_usdAmount));
    let newvBaycPoolSize: int256 = k.dividedBy(newvUsdPoolSize);

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isHardLiquidatable: boolean = this._isHardLiquidatable(
          this.activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          
          //update new pool
          k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
          newvBaycPoolSize = newvBaycPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservBaycBalance);
          newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);
          //update pool
          k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
          vBaycPoolSize = vBaycPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservBaycBalance);
          vUsdPoolSize = k.dividedBy(vBaycPoolSize);
        }
      }
    }

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isPartialLiquidatable: boolean = this._isPartialLiquidatable(
          this.activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          const vUsdPartialLiquidateAmount: uint256 = this._calculatePartialLiquidateValue(
            this.activeUsers[i],
            uint256(newvBaycPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (this.virtualBalances[this.activeUsers[i]].uservBaycBalance.gt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[this.activeUsers[i]].uservBaycBalance.lt(0)) {
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
      }
    }

    k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    const finalvUsdPoolSize: int256 = vUsdPoolSize.plus(int256(_usdAmount));
    const finalvBaycPoolSize: int256 = k.dividedBy(finalvUsdPoolSize);
    const userBaycOut: int256 = vBaycPoolSize.minus(finalvBaycPoolSize);
    return uint256(userBaycOut);
  }

  //get minimum short bayc amount that user receives
  contract.getMinimumShortBaycOut = function(_usdAmount: uint256): uint256 {
    let vBaycPoolSize: int256 = int256(this.pool.vBaycPoolSize);
    let vUsdPoolSize: int256 = int256(this.pool.vUsdPoolSize);
    let k: int256 = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    let newvUsdPoolSize: int256 = vUsdPoolSize.minus(int256(_usdAmount));
    let newvBaycPoolSize: int256 = k.dividedBy(newvUsdPoolSize);

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isHardLiquidatable: boolean = this._isHardLiquidatable(
          this.activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) { 
          //update new pool
          k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
          newvBaycPoolSize = newvBaycPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservBaycBalance);
          newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);
          //update pool
          k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
          vBaycPoolSize = vBaycPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservBaycBalance);
          vUsdPoolSize = k.dividedBy(vBaycPoolSize);
          
        }
      }
    }
    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isPartialLiquidatable: boolean = this._isPartialLiquidatable(
          this.activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          
          const vUsdPartialLiquidateAmount: uint256 = this._calculatePartialLiquidateValue(
            this.activeUsers[i],
            uint256(newvBaycPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (this.virtualBalances[this.activeUsers[i]].uservBaycBalance.gt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[this.activeUsers[i]].uservBaycBalance.lt(0)) {
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
      }
    }

    k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    const finalvUsdPoolSize: int256 = vUsdPoolSize.minus(int256(_usdAmount));
    const finalvBaycPoolSize: int256 = k.dividedBy(finalvUsdPoolSize);
    const userBaycOut: int256 = finalvBaycPoolSize.minus(vBaycPoolSize);

    return uint256(userBaycOut);

  }


  //get minimum long usd amount that user receives
  contract.getMinimumLongUsdOut = function(_BaycAmount: uint256): uint256 {
    let vBaycPoolSize: int256 = int256(this.pool.vBaycPoolSize);
    let vUsdPoolSize: int256 = int256(this.pool.vUsdPoolSize);
    let k: int256 = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    let newvBaycPoolSize: int256 = vBaycPoolSize.minus(int256(_BaycAmount));
    let newvUsdPoolSize: int256 = k.dividedBy(newvBaycPoolSize);


    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isHardLiquidatable: boolean = this._isHardLiquidatable(
          this.activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          
          //update new pool
          k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
          newvBaycPoolSize = newvBaycPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservBaycBalance);
          newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);
          //update pool
          k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
          vBaycPoolSize = vBaycPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservBaycBalance);
          vUsdPoolSize = k.dividedBy(vBaycPoolSize);
        }
      }
    }

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isPartialLiquidatable: boolean = this._isPartialLiquidatable(
          this.activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          const vUsdPartialLiquidateAmount: uint256 = this._calculatePartialLiquidateValue(
            this.activeUsers[i],
            uint256(newvBaycPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (this.virtualBalances[this.activeUsers[i]].uservBaycBalance.gt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[this.activeUsers[i]].uservBaycBalance.lt(0)) {
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
      }
    }


    k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    const finalvBaycPoolSize: int256 = vBaycPoolSize.minus(int256(_BaycAmount));
    const finalvUsdPoolSize: int256 = k.dividedBy(finalvBaycPoolSize);
    const userUsdOut: int256 = finalvUsdPoolSize.minus(vUsdPoolSize);
    return uint256(userUsdOut);
  }


  //get minimum short usd amount that user receives
  contract.getMinimumShortUsdOut = function(_BaycAmount: uint256): uint256 {
    let vBaycPoolSize: int256 = int256(this.pool.vBaycPoolSize);
    let vUsdPoolSize: int256 = int256(this.pool.vUsdPoolSize);
    let k: int256 = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    let newvBaycPoolSize: int256 = vBaycPoolSize.plus(int256(_BaycAmount));
    let newvUsdPoolSize: int256 = k.dividedBy(newvBaycPoolSize);

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isHardLiquidatable: boolean = this._isHardLiquidatable(
          this.activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          
          //update new pool
          k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
          newvBaycPoolSize = newvBaycPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservBaycBalance);
          newvUsdPoolSize = k.dividedBy(newvBaycPoolSize);
          //update pool
          k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
          vBaycPoolSize = vBaycPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservBaycBalance);
          vUsdPoolSize = k.dividedBy(vBaycPoolSize);
        }
      }
    }

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isPartialLiquidatable: boolean = this._isPartialLiquidatable(
          this.activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          const vUsdPartialLiquidateAmount: uint256 = this._calculatePartialLiquidateValue(
            this.activeUsers[i],
            uint256(newvBaycPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (this.virtualBalances[this.activeUsers[i]].uservBaycBalance.gt(0)) {
            //update new pool
            k = newvBaycPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvBaycPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vBaycPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[this.activeUsers[i]].uservBaycBalance.lt(0)) {
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
      }
    }

    k = vBaycPoolSize.multipliedBy(vUsdPoolSize);
    const finalvBaycPoolSize: int256 = vBaycPoolSize.plus(int256(_BaycAmount));
    const finalvUsdPoolSize: int256 = k.dividedBy(finalvBaycPoolSize);
    const userUsdOut: int256 = vUsdPoolSize.minus(finalvUsdPoolSize);
    return uint256(userUsdOut);
  }

  //Liquidate user partialy according to the new price
  contract._partialLiquidate = function(
    _user: string,
    _vBaycNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): Array<uint256> {
    Require(
      this._isPartialLiquidatable(_user, _vBaycNewPoolSize, _vUsdNewPoolSize),
      "user can not be partially liquidated"
    );
    let vBaycNewPoolSize = _vBaycNewPoolSize;
    let vUsdNewPoolSize = _vUsdNewPoolSize;

    const liquidateAmount: uint256 = this._calculatePartialLiquidateValue(
      _user,
      _vBaycNewPoolSize,
      _vUsdNewPoolSize
    );
    //uint baycLiquidateAmount = liquidateAmount*this.pool.vBaycPoolSize/this.pool.vUsdPoolSize;
    // return BaycLiquidateAmount;
    if (this.virtualBalances[_user].uservBaycBalance.gt(0)) {
      // _closeLongPosition(_user, baycLiquidateAmount);

      //get the output usd of closing position
      // const usdBaycValue: uint256 = getShortVusdAmountOut(baycLiquidateAmount);
      const usdBaycValue: uint256 = liquidateAmount;
      const baycLiquidateAmount: uint256 = this.getShortBaycAmountOut(usdBaycValue);
      const userPartialvUsdBalance: int256 = (this.virtualBalances[_user].uservUsdBalance.multipliedBy(
        int256(baycLiquidateAmount))).dividedBy(this.virtualBalances[_user].uservBaycBalance);

      //increase or decrease the user pnl for this function
      if (usdBaycValue.gt(this.positive(userPartialvUsdBalance))) {
        const pnl: uint256 = usdBaycValue.minus(this.positive(userPartialvUsdBalance));
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
      } else if (usdBaycValue.lt(this.positive(userPartialvUsdBalance))) {
        const pnl: uint256 = this.positive(userPartialvUsdBalance).minus(usdBaycValue);
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
      }
      //realize funding reward of user;
      const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
      if (!realizeVirtualCollAmount.eq(0)) {
        this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      this.virtualBalances[_user].uservBaycBalance = this.virtualBalances[_user].uservBaycBalance.minus(int256(baycLiquidateAmount));
      this.virtualBalances[_user].uservUsdBalance = this.virtualBalances[_user].uservUsdBalance.plus(this.absoluteInt(userPartialvUsdBalance));
      // if user has not vbalance so he is not active
      if (
        this.virtualBalances[_user].uservBaycBalance.eq(0) && this.virtualBalances[_user].uservUsdBalance.eq(0)
      ) {
        this._removeActiveUser(_user);
      }
      //update the pool
      const k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vBaycPoolSize = this.pool.vBaycPoolSize.plus(baycLiquidateAmount);
      this.pool.vUsdPoolSize = k.dividedBy(this.pool.vBaycPoolSize);
      //update the newPoolSize
      vBaycNewPoolSize = vBaycNewPoolSize.plus(baycLiquidateAmount);
      vUsdNewPoolSize = k.dividedBy(vBaycNewPoolSize);
    } else if (this.virtualBalances[_user].uservBaycBalance.lt(0)) {
      //get the output usd of closing position
      const usdBaycValue: uint256 = liquidateAmount;
      const baycLiquidateAmount: uint256 = this.getLongBaycAmountOut(usdBaycValue);
      const userPartialvUsdBalance: int256 = (this.virtualBalances[_user].uservUsdBalance.multipliedBy(
        int256(baycLiquidateAmount))).dividedBy(this.virtualBalances[_user].uservBaycBalance);
      //increase or decrease pnl of the user
      if (usdBaycValue.gt(uint256(this.positive(userPartialvUsdBalance)))) {
        const pnl: uint256 = usdBaycValue.minus(uint256(this.positive(userPartialvUsdBalance)));
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
      }
      if (usdBaycValue.lt(this.positive(userPartialvUsdBalance))) {
        const pnl: uint256 = this.positive(userPartialvUsdBalance).minus(usdBaycValue);
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
      }
      //realize funding reward of user;
      const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
      if (!realizeVirtualCollAmount.eq(0)) {
        this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      this.virtualBalances[_user].uservBaycBalance = this.virtualBalances[_user].uservBaycBalance.plus(int256(baycLiquidateAmount));
      this.virtualBalances[_user].uservUsdBalance = this.virtualBalances[_user].uservUsdBalance.minus(this.absoluteInt(userPartialvUsdBalance));
      // if user has not vbalance so he is not active
      if (
        this.virtualBalances[_user].uservBaycBalance == 0 && this.virtualBalances[_user].uservUsdBalance == 0
      ) {
        this._removeActiveUser(_user);
      }
      //update pool
      const k2: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vBaycPoolSize = this.pool.vBaycPoolSize.minus(baycLiquidateAmount);
      this.pool.vUsdPoolSize = k2.dividedBy(this.pool.vBaycPoolSize);
      //update the newPoolSize
      vBaycNewPoolSize = vBaycNewPoolSize.minus(baycLiquidateAmount);
      vUsdNewPoolSize = k2.dividedBy(vBaycNewPoolSize);
    }
    const discountAmount: uint256 = (liquidateAmount.multipliedBy(this.discountRate)).dividedBy(100);
    this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(discountAmount);
    this.insuranceFunds = this.insuranceFunds.plus(discountAmount);

    return [
      vBaycNewPoolSize,
      vUsdNewPoolSize,
    ];
  }

  //liquidate users according to the new price (is used only in trade trade functions)
  contract._hardLiquidateUsers = function(_vBaycNewPoolSize: uint256, _vUsdNewPoolSize: uint256)
    : Array<uint256>
  {
    let vBaycNewPoolSize = _vBaycNewPoolSize;
    let vUsdNewPoolSize = _vUsdNewPoolSize;
    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isLiquidatable: boolean = this._isHardLiquidatable(
          this.activeUsers[i],
          vBaycNewPoolSize,
          vUsdNewPoolSize
        );
        if (isLiquidatable == true) {
          const userMargin: int256 = this._userNewMargin(this.activeUsers[i], vBaycNewPoolSize, vUsdNewPoolSize);
          if (userMargin.gt(0)) {
            [vBaycNewPoolSize, vUsdNewPoolSize] = this._hardLiquidate(
              this.activeUsers[i],
              vBaycNewPoolSize,
              vUsdNewPoolSize
            );
          } else if (userMargin.lt(0)) {
            [vBaycNewPoolSize, vUsdNewPoolSize] = this._hardNegativeLiquidate(
              this.activeUsers[i],
              vBaycNewPoolSize,
              vUsdNewPoolSize
            );
          }
        }
      }
    }

    return [
      vBaycNewPoolSize,
      vUsdNewPoolSize,
    ];
  }

  //liquidate users partialy according to the new price (is used only in trade trade functions)
  contract._partialLiquidateUsers = function(_vBaycNewPoolSize: uint256, _vUsdNewPoolSize: uint256)
    : Array<uint256>
  {
    let vBaycNewPoolSize = _vBaycNewPoolSize;
    let vUsdNewPoolSize = _vUsdNewPoolSize;
    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isPartialLiquidatable: boolean = this._isPartialLiquidatable(
          this.activeUsers[i],
          vBaycNewPoolSize,
          vUsdNewPoolSize
        );
        if (isPartialLiquidatable == true) {
          [vBaycNewPoolSize, vUsdNewPoolSize] = this._partialLiquidate(
            this.activeUsers[i],
            vBaycNewPoolSize,
            vUsdNewPoolSize
          );
        }
      }
    }

    return [
      vBaycNewPoolSize,
      vUsdNewPoolSize,
    ];
  }

  contract.getAllLongvBaycBalance = function(): int256 {
    let allLongBaycBalance = int256(0);
    for (let i = 0; i < this.activeUsers.length; i++) {
      const user: string = this.activeUsers[i];
      const vBaycBalance: int256 = this.virtualBalances[user].uservBaycBalance;
      if (vBaycBalance.gt(0)) {
        allLongBaycBalance = allLongBaycBalance.plus(vBaycBalance);
      }
    }
    return allLongBaycBalance;
  }

  contract.getAllShortvBaycBalance = function(): int256 {
    let allShortBaycBalance = int256(0);
    for (let i = 0; i < this.activeUsers.length; i++) {
      const user: string = this.activeUsers[i];
      const vBaycBalance: int256 = this.virtualBalances[user].uservBaycBalance;
      if (vBaycBalance.lt(0)) {
        allShortBaycBalance = allShortBaycBalance.plus(vBaycBalance);
      }
    }
    return allShortBaycBalance;
  }

  contract.setFundingRate = function(){
    const currentPrice: uint256 = (this.pool.vUsdPoolSize.multipliedBy(1e18)).dividedBy(this.pool.vBaycPoolSize);
    const oraclePrice: uint256 = this.showPriceUSD();

    //first the contract check actual vBayc positions balance of users
    const allLongvBaycBalance: int256 = this.getAllLongvBaycBalance();
    const allShortBaycBalance: int256 = this.getAllShortvBaycBalance();

    //check if we dont have one side(long or short balance = 0) this funding action will not run
    if (allLongvBaycBalance.gt(0) && allShortBaycBalance.lt(0)) {
      if (currentPrice.gt(oraclePrice)) {
        const minOpenInterest: int256 = (
          this.absoluteInt(allLongvBaycBalance).gt(this.absoluteInt(allShortBaycBalance))
            ? this.absoluteInt(allShortBaycBalance)
            : this.absoluteInt(allLongvBaycBalance)
        );
        const difference: uint256 = currentPrice.minus(oraclePrice);
        const fundingFee: uint256 = (uint256(minOpenInterest).multipliedBy(difference)).dividedBy(24e18);
        for (let i = 0; i < this.activeUsers.length; i++) {
          const user: string = this.activeUsers[i];
          if (this.virtualBalances[user].uservBaycBalance.gt(0)) {
            //change vitraul collateral of user
            const userFundingFee: uint256 = (fundingFee.multipliedBy(
              uint256(this.virtualBalances[user].uservBaycBalance))).dividedBy(uint256(allLongvBaycBalance));
            this.virtualBalances[user].virtualCollateral = this.virtualBalances[user].virtualCollateral.minus(int256(userFundingFee));
          } else if (this.virtualBalances[user].uservBaycBalance.lt(0)) {
            //change vitraul collateral of user
            const userFundingFee: uint256 = (fundingFee.multipliedBy(
              this.positive(this.virtualBalances[user].uservBaycBalance))).dividedBy(this.positive(allShortBaycBalance));
            this.virtualBalances[user].virtualCollateral = this.virtualBalances[user].virtualCollateral.plus(int256(userFundingFee));
          }
        }
      } else if (currentPrice.lt(oraclePrice)) {
        const minOpenInterest: int256 = (
          this.absoluteInt(allLongvBaycBalance).gt(this.absoluteInt(allShortBaycBalance))
            ? this.absoluteInt(allShortBaycBalance)
            : this.absoluteInt(allLongvBaycBalance)
        );
        const difference: uint256 = oraclePrice.minus(currentPrice);
        const fundingFee: uint256 = (uint256(minOpenInterest).multipliedBy(difference)).dividedBy(24e18);
        for (let i = 0; i < this.activeUsers.length; i++) {
          const user: string = this.activeUsers[i];
          if (this.virtualBalances[user].uservBaycBalance.gt(0)) {
            //change vitraul collateral of user
            const userFundingFee: uint256 = (fundingFee.multipliedBy(
              uint256(this.virtualBalances[user].uservBaycBalance))).dividedBy(uint256(allLongvBaycBalance));
            this.virtualBalances[user].virtualCollateral = this.virtualBalances[user].virtualCollateral.plus(int256(userFundingFee));
          } else if (this.virtualBalances[user].uservBaycBalance.lt(0)) {
            //change vitraul collateral of user
            const userFundingFee: uint256 = (fundingFee.multipliedBy(
              this.positive(this.virtualBalances[user].uservBaycBalance))).dividedBy(this.positive(allShortBaycBalance));
            this.virtualBalances[user].virtualCollateral = this.virtualBalances[user].virtualCollateral.minus(int256(userFundingFee));
          }
        }
      }
    }
  }

  //return positive int
  contract.this.absoluteInt = function(_value: int256): int256 {
    if (_value.gt(0)) {
      return _value.negated();
    } else {
      return _value;
    }
  }

  //return false if new price go further than the oracle price
  contract.isPriceIntheRightRange = function(_vBaycNewPoolSize: uint256, _vUsdNewPoolSize: uint256): boolean
  {
    const currentPrice: uint256 = (this.pool.vUsdPoolSize.multipliedBy(1e18)).dividedBy(this.pool.vBaycPoolSize);
    const oraclePrice: uint256 = this.showPriceUSD();
    const newPrice: uint256 = (_vUsdNewPoolSize.multipliedBy(1e18)).dividedBy(_vBaycNewPoolSize);

    const currentDifference: int256 = int256(oraclePrice).minus(int256(currentPrice));
    const currentDifferencePercentage: int256 = (currentDifference.multipliedBy(100)).dividedBy(int256(currentPrice));
    const currentDifferenceDistance: int256 = this.absoluteInt(currentDifferencePercentage).minus(10);

    const newDifference: int256 = int256(oraclePrice).minus(int256(newPrice));
    const newDifferencePercentage: int256 = (newDifference.multipliedBy(100)).dividedBy(int256(newPrice));
    const newDifferenceDistance: int256 = this.absoluteInt(newDifferencePercentage).minus(10);

    if (currentDifferenceDistance.gt(0)) {
      //we are outside the target range and need to be brought back
      if (newDifferenceDistance.lt(currentDifferenceDistance)) {
        return true; //trade allowed, we move closer
      } else {
        return false; //trade is not allowed, we move more distant
      }
    } else {
      //we are inside the target range
      if (newDifferenceDistance.lt(10)) {
        return true; //trade allowed we stay within target range.
      } else {
        return false;
      }
    }
  }

  // remove insurance funds from contract to owner account
  contract.removeInsuranceFunds = function(_amount: uint256) {
    Require(
      _amount.lte(this.insuranceFunds),
      "Requested collect amount is largser than the ContractFee balance."
    );
    SafeERC20.safeTransfer(IERC20(this.usdc), msg.sender, _amount);
    this.insuranceFunds = this.insuranceFunds.minus(_amount);
  }

  contract.isLongInRightRange = function(_usdAmount: uint256): boolean {
    const k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.plus(_usdAmount);
    let newvBaycPoolSize: uint256 = k.dividedBy(newvUsdPoolSize);
    const isInTheRightRange: boolean = this.isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    return isInTheRightRange;
  }

  contract.isShortInRightRange = function(_usdAmount: uint256): boolean {
    const k: uint256 = this.pool.vBaycPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.minus(_usdAmount);
    let newvBaycPoolSize: uint256 = k.dividedBy(newvUsdPoolSize);
    const isInTheRightRange: boolean = this.isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    return isInTheRightRange;
  }

  contract.marketPrice = function(): uint256 {
    return (this.pool.vUsdPoolSize.multipliedBy(1e18)).dividedBy(this.pool.vBaycPoolSize);
  }

  return contract;
}