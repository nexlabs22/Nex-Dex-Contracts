import { 
  address, int256, uint256, SafeERC20, IERC20, Owner, msg
} from "../../solidity";
import  { Require, WeitoNumber } from '../../basics';
import { PrintContractStatus } from "../../core/worker";


interface Pool {
  vAssetPoolSize: uint256;
  vUsdPoolSize: uint256;
}

interface VirtualBalance {
  virtualCollateral: int256;
  uservUsdBalance: int256;
  uservAssetBalance: uint256;
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

/////////////////////////////////////////////////////////////////////////////////
//// TODO: Should be fixed later...
/////////////////////////////////////////////////////////////////////////////////
function AggregatorV3Interface(type: boolean) {
  // now we are testing contract with temp price - $2000
  if (type === true) // nftFloorPriceFeed
  {
    return {
      latestRoundData: function() {
        return [
          uint256(0), /*uint80 roundID*/
          int256(1).multipliedBy(1e18),  /*uint startedAt*/
          uint256(0), /*uint timeStamp*/
          uint256(0), /*uint80 answeredInRound*/
        ]
      }
    }
  }
  
  else // priceFeed
  {
    return {
      latestRoundData: function() {
        return [
          uint256(0), /*uint80 roundID*/
          int256(2000).multipliedBy(1e8),  /*uint startedAt*/
          uint256(0), /*uint timeStamp*/
          uint256(0), /*uint80 answeredInRound*/
        ]
      }
    }
  }
}
/////////////////////////////////////////////////////////////////////////////////

export default function(contract: any) {

  contract.usdc = address(0);

  contract.poolInitialized = Boolean(false); // is pool initialized

  contract.liquidationFee = uint256(0);

  contract.discountRate = uint256(20); //20%
  contract.saveLevelMargin = uint256(60); //60%
  contract.maintenanceMargin = uint256(50); //50%
  contract.AutoCloseMargin = uint256(40); //40%

  contract.swapFee = uint256(10); //=> 10/10000 = 0.1%
  contract.latestFeeUpdate = uint256(0);

  contract.liquidateList = [] as Array<string>;
  contract.pool = {
    vAssetPoolSize: uint256(0),
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
    // TODO: implement AggregatorV3Interface
    // this.nftFloorPriceFeed = AggregatorV3Interface(_nftOracleAddress);
    // this.priceFeed = AggregatorV3Interface(_priceFeed);

    this.nftFloorPriceFeed = AggregatorV3Interface(true);
    this.priceFeed = AggregatorV3Interface(false);
    this.usdc = _usdc;

    this.collateral[this.usdc] = {} as AddressToUint256; // ** only in testing
  }

  //return Asset virtual pool size of the market
  contract.vAssetPoolSize = function(): uint256 {
    return this.pool.vAssetPoolSize;
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

  //return virtual Asset balance of each user
  contract.uservAssetBalance = function(_user: string): int256 {
    return this.virtualBalances[_user].uservAssetBalance;
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
  contract.getAllActiveUsers = function(): Array<string> {
    return this.activeUsers;
  }

  //create the pool
  //for this time owner can do it
  contract.initialVirtualPool = function(_assetSize: uint256) {
    Require(this.poolInitialized == false, "You cannot initialize pool again");
    const oraclePrice: uint256 = this.showPriceUSD();
    this.pool.vAssetPoolSize = _assetSize;
    this.pool.vUsdPoolSize = (_assetSize.multipliedBy(oraclePrice)).dividedBy(1e18);
    this.poolInitialized = true;
  }

  contract.changeNftOracleAddress = function(_newAddress: string) {
    // this.nftFloorPriceFeed = AggregatorV3Interface(_newAddress);
  }

  //Notice: newFee should be between 1 to 500 (0.01% - 5%)
  contract.setSwapFee = function(_newFee: uint256) {
    // TODO: block.timestamp
    // const distance: uint256 = block.timestamp - this.latestFeeUpdate;
    // Require(distance / 60 / 60 > 12, "You should wait at least 12 hours after the latest update");
    // Require(_newFee.lte(500) && _newFee.gte(1), "The newFee should be between 1 and 500 (0.01% - 5%)");
    // this.swapFee = _newFee;
    // this.latestFeeUpdate = block.timestamp;
  }

  //deposit collateral
  contract.depositCollateral = function(_amount: uint256) {
    if (!this.collateral[this.usdc][msg.sender])        // ** only in testing
    {
      this.collateral[this.usdc][msg.sender] = uint256(0); 
      this.virtualBalances[msg.sender] = {};
      this.virtualBalances[msg.sender].virtualCollateral = int256(0);
      this.virtualBalances[msg.sender].uservUsdBalance = int256(0);
      this.virtualBalances[msg.sender].uservAssetBalance = int256(0);
    }

    SafeERC20.safeTransferFrom(IERC20(this.usdc), msg.sender, address(this), _amount);
    this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].plus(_amount);
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
    this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].minus(_amount);
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

  //get output Asset by usd input amount if we want to buy(long)
  //how much Asset we will get by paying usd for long
  contract.getLongAssetAmountOut = function(_vUsdAmount: uint256): uint256 {
    const k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    const newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.plus(_vUsdAmount);
    const newvAssetPoolSize: uint256 = k.dividedBy(newvUsdPoolSize);
    const userAsset: uint256 = this.pool.vAssetPoolSize.minus(newvAssetPoolSize);
    return userAsset;
  }

  //get output usd amount by Asset input amount if we want to buy(long)
  contract.getLongVusdAmountOut = function(_vAssetAmount: uint256): uint256 {
    const k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    const newvAssetPoolSize: uint256 = this.pool.vAssetPoolSize.minus(_vAssetAmount);
    const newvUsdPoolSize: uint256 = k.dividedBy(newvAssetPoolSize);
    const uservUsd: uint256 = newvUsdPoolSize.minus(this.pool.vUsdPoolSize);
    return uservUsd;
  }

  //get output Asset by usd input amount if we want to sell(short)
  contract.getShortAssetAmountOut = function(_vUsdAmount: uint256): uint256 {
    const k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    const newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.minus(_vUsdAmount);
    const newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
    const userAsset: uint256 = newvAssetPoolSize.minus(this.pool.vAssetPoolSize);
    return userAsset;
  }

  //get output usd by Asset input amount if we want to sell(short)
  contract.getShortVusdAmountOut = function(_vAssetAmount: uint256): uint256 {
    const k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    const newvAssetPoolSize: uint256 = this.pool.vAssetPoolSize.plus(_vAssetAmount);
    const newvUsdPoolSize: uint256 = k.dividedBy(newvAssetPoolSize);
    const uservUsd: uint256 = this.pool.vUsdPoolSize.minus(newvUsdPoolSize);
    return uservUsd;
  }

  //I use int for negative/positve numbers for user Asset and usd balance(wich might be negative)
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
    return (this.pool.vUsdPoolSize.multipliedBy(1e18)).dividedBy(this.pool.vAssetPoolSize);
  }

  contract.openLongPosition = function(_usdAmount: uint256, _minimumAssetAmountOut: uint256): void {
    //calculate the new pool size and user Asset amount
    let k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.plus(_usdAmount);
    let newvAssetPoolSize: uint256 = k.dividedBy(newvUsdPoolSize);
    /*
    bool isInTheRightRange = isPriceIntheRightRange(newvAssetPoolSize, newvUsdPoolSize);
    require(
      isInTheRightRange == true,
      "You can't move the price more than 10% away from the oracle price."
    );
    */
    const isNewMarginHardLiquidatable: boolean = this._isNewMarginLiquidatable(
      msg.sender,
      _usdAmount,
      newvAssetPoolSize,
      newvUsdPoolSize
    );

    Require(
      isNewMarginHardLiquidatable == false,
      "Insufficient margin to open position with requested size."
    );

    //first we run liquidation functions
    [newvAssetPoolSize, newvUsdPoolSize] = this._hardLiquidateUsers(newvAssetPoolSize, newvUsdPoolSize);
    [newvAssetPoolSize, newvUsdPoolSize] = this._partialLiquidateUsers(newvAssetPoolSize, newvUsdPoolSize);

    k = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    newvUsdPoolSize = this.pool.vUsdPoolSize.plus(_usdAmount);
    newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
    const userAsset:uint256 = this.pool.vAssetPoolSize.minus(newvAssetPoolSize);
    Require(userAsset.gte(_minimumAssetAmountOut), "INSUFFICIENT_OUTPUT_AMOUNT");
    //update Asset and usd balance of user
    this.virtualBalances[msg.sender].uservAssetBalance = this.virtualBalances[msg.sender].uservAssetBalance.plus(int256(userAsset));
    this.virtualBalances[msg.sender].uservUsdBalance = this.virtualBalances[msg.sender].uservUsdBalance.minus(int256(_usdAmount));

    //add user to the active user list
    this._addActiveUser(msg.sender);

    //trade fee
    const fee: uint256 = (_usdAmount.multipliedBy(this.swapFee)).dividedBy(10000);
    this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].minus(fee);
    const owner: address = Owner();
    SafeERC20.safeTransfer(IERC20(this.usdc), owner, fee);

    //update pool
    this.pool.vAssetPoolSize = newvAssetPoolSize;
    this.pool.vUsdPoolSize = newvUsdPoolSize;
  }

  contract.openShortPosition = function(_usdAmount: uint256, _minimumAssetAmountOut: uint256) {
    //calculate the new pool size and user Asset amount
    let k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.minus(_usdAmount);
    let newvAssetPoolSize: uint256 = k.dividedBy(newvUsdPoolSize);
    /*
    bool isInTheRightRange = isPriceIntheRightRange(newvAssetPoolSize, newvUsdPoolSize);
    require(
      isInTheRightRange == true,
      "You can't move the price more than 10% away from the oracle price."
    );
    */
    const isNewMarginHardLiquidatable: boolean = this._isNewMarginLiquidatable(
      msg.sender,
      _usdAmount,
      newvAssetPoolSize,
      newvUsdPoolSize
    );
    Require(
      isNewMarginHardLiquidatable == false,
      "Insufficient margin to open position with requested size."
    );

    //first we run liquidation functions
    [newvAssetPoolSize, newvUsdPoolSize] = this._hardLiquidateUsers(newvAssetPoolSize, newvUsdPoolSize);
    [newvAssetPoolSize, newvUsdPoolSize] = this._partialLiquidateUsers(newvAssetPoolSize, newvUsdPoolSize);

    k = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    newvUsdPoolSize = this.pool.vUsdPoolSize.minus(_usdAmount);
    newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
    const userAsset: uint256 = newvAssetPoolSize.minus(this.pool.vAssetPoolSize);
    Require(userAsset.gte(_minimumAssetAmountOut), "INSUFFICIENT_OUTPUT_AMOUNT");
    //update Asset and usd balance of user
    this.virtualBalances[msg.sender].uservAssetBalance = this.virtualBalances[msg.sender].uservAssetBalance.minus(int256(userAsset));
    this.virtualBalances[msg.sender].uservUsdBalance = this.virtualBalances[msg.sender].uservUsdBalance.plus(int256(_usdAmount));

    //add user to the active user list
    this._addActiveUser(msg.sender);

    //trade fee
    const fee: uint256 = (_usdAmount.multipliedBy(this.swapFee)).dividedBy(10000);
    this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].minus(fee);
    const owner: address = Owner();
    SafeERC20.safeTransfer(IERC20(this.usdc), owner, fee);

    //update pool
    this.pool.vAssetPoolSize = newvAssetPoolSize;
    this.pool.vUsdPoolSize = newvUsdPoolSize;
  }

  contract._closeLongPosition = function(_user: string, _assetSize: uint256, _minimumUsdOut: uint256) {
    Require(
      _assetSize.lte(this.positive(this.virtualBalances[_user].uservAssetBalance)),
      "Reduce only order can only close long size equal or less than the outstanding asset size."
    );

    let k: uint256;
    //first we run liquidation functions
    k = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let vAssetNewPoolSize: uint256 = this.pool.vAssetPoolSiz.plus(_assetSize);
    let vUsdNewPoolSize: uint256 = k.dividedBy(vAssetNewPoolSize);

    //liquidate users
    [vAssetNewPoolSize, vUsdNewPoolSize] = this._hardLiquidateUsers(vAssetNewPoolSize, vUsdNewPoolSize);
    [vAssetNewPoolSize, vUsdNewPoolSize] = this._partialLiquidateUsers(vAssetNewPoolSize, vUsdNewPoolSize);

    //get the output usd of closing position
    //f.e 1Asset -> 2000$
    const usdAssetValue: uint256 = this.getShortVusdAmountOut(_assetSize);
    Require(usdAssetValue.gte(_minimumUsdOut), "INSUFFICIENT_OUTPUT_AMOUNT");
    const userPartialvUsdBalance: int256 = (this.virtualBalances[_user].uservUsdBalance.multipliedBy(int256(_assetSize))).dividedBy(
      this.virtualBalances[_user].uservAssetBalance);

    //increase or decrease the user pnl for this function
    if (usdAssetValue.gt(uint256(this.positive(userPartialvUsdBalance)))) {
      const pnl: uint256 = usdAssetValue.minus(uint256(this.positive(userPartialvUsdBalance)));
      // this.collateral[this.usdc][_user] += pnl;
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
    } else if (usdAssetValue.lt(uint256(this.positive(userPartialvUsdBalance)))) {
      const pnl: uint256 = uint256(this.positive(userPartialvUsdBalance).minus(usdAssetValue));
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
    }
    //realize funding reward of user;
    const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
    if (!realizeVirtualCollAmount.eq(0)) {
      this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
    }
    //update user balance
    this.virtualBalances[_user].uservAssetBalance = this.virtualBalances[_user].uservAssetBalance.minus(int256(_assetSize));
    this.virtualBalances[_user].uservUsdBalance = this.virtualBalances[_user].uservUsdBalance.plus(this.absoluteInt(userPartialvUsdBalance));
    // if user has not vbalance so he is not active
    if (
      this.virtualBalances[_user].uservAssetBalance.eq(0) && this.virtualBalances[_user].uservUsdBalance.eq(0)
    ) {
      this._removeActiveUser(_user);
    }

    //trade fee
    const fee: uint256 = (usdAssetValue.multipliedBy(this.swapFee)).dividedBy(10000);
    this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(fee);
    const owner: string = Owner();
    SafeERC20.safeTransfer(IERC20(this.usdc), owner, fee);

    //update the pool
    k = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    this.pool.vAssetPoolSize = this.pool.vAssetPoolSize.plus(_assetSize);
    this.pool.vUsdPoolSize = k.dividedBy(this.pool.vAssetPoolSize);
  }

  contract._closeShortPosition = function(_user: string, _assetSize: uint256, _minimumUsdOut: uint256): void {
    Require(
      _assetSize.lte(this.positive(this.virtualBalances[_user].uservAssetBalance)),
      "Reduce only order can only close short size equal or less than the outstanding asset size."
    );

    let k: uint256;
    //first we run liquidation functions
    k = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let vAssetNewPoolSize: uint256 = this.pool.vAssetPoolSize.minus(_assetSize);
    let vUsdNewPoolSize: uint256 = k.dividedBy(vAssetNewPoolSize);


    //liquidate users
    [vAssetNewPoolSize, vUsdNewPoolSize] = this._hardLiquidateUsers(vAssetNewPoolSize, vUsdNewPoolSize);
    [vAssetNewPoolSize, vUsdNewPoolSize] = this._partialLiquidateUsers(vAssetNewPoolSize, vUsdNewPoolSize);
    //get the output usd of closing position
    const usdAssetValue: uint256 = this.getLongVusdAmountOut(_assetSize);
    Require(usdAssetValue.gte(_minimumUsdOut), "INSUFFICIENT_OUTPUT_AMOUNT");

    const userPartialvUsdBalance: int256 = (this.virtualBalances[_user].uservUsdBalance.multipliedBy(int256(_assetSize))).dividedBy(
      this.virtualBalances[_user].uservAssetBalance);
    //increase or decrease pnl of the user
    if (usdAssetValue.gt(uint256(this.positive(userPartialvUsdBalance)))) {
      const pnl: uint256 = usdAssetValue.minus(uint256(this.positive(userPartialvUsdBalance)));
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
    }
    if (usdAssetValue.lt(uint256(this.positive(userPartialvUsdBalance)))) {
      const pnl: uint256 = uint256(this.positive(userPartialvUsdBalance).minus(usdAssetValue));
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
    }
    //realize funding reward of user;
    const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
    if (!realizeVirtualCollAmount.eq(0)) {
      this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
    }
    //update user balance
    this.virtualBalances[_user].uservAssetBalance = this.virtualBalances[_user].uservAssetBalance.plus(int256(_assetSize));
    this.virtualBalances[_user].uservUsdBalance = this.virtualBalances[_user].uservUsdBalance.minus(this.absoluteInt(userPartialvUsdBalance));
    // if user has not vbalance so he is not active
    if (
      this.virtualBalances[_user].uservAssetBalance.eq(0) && this.virtualBalances[_user].uservUsdBalance.eq(0)
    ) {
      this._removeActiveUser(_user);
    }
    //trade fee
    const fee: uint256 = (usdAssetValue.multipliedBy(this.swapFee)).dividedBy(10000);
    this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(fee);
    const owner: address = Owner();
    SafeERC20.safeTransfer(IERC20(this.usdc), owner, fee);
    //update pool
    k = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    this.pool.vAssetPoolSize = this.pool.vAssetPoolSize.minus(_assetSize);
    this.pool.vUsdPoolSize = k.dividedBy(this.pool.vAssetPoolSize);
  }

  contract.closePositionComplete = function(_minimumUsdOut: uint256): void {
    const assetSize: uint256 = this.positive(this.virtualBalances[msg.sender].uservAssetBalance);
    this.closePosition(assetSize, _minimumUsdOut);
  }

  contract.closePosition = function(_assetSize: uint256, _minimumUsdOut: uint256): void {
    Require(
      _assetSize.lte(this.positive(this.virtualBalances[msg.sender].uservAssetBalance)),
      "Reduce only order can only close size equal or less than the outstanding asset size."
    );
    //if user has positive vAsset balance so he/she has longPosition
    //if user has negative vAsset balance so he/she has shortPosition
    if (this.virtualBalances[msg.sender].uservAssetBalance.gt(0)) {
      this._closeLongPosition(msg.sender, _assetSize, _minimumUsdOut);
    } else if (this.virtualBalances[msg.sender].uservAssetBalance.lt(0)) {
      this._closeShortPosition(msg.sender, _assetSize, _minimumUsdOut);
    }
  }

  //return the pnl of user
  /*
  user vAsset balance = 2Asset
  user vUsd balance = -3000
  currnent 2 vAsset value =  4000
  user pnl = 4000 - this.positive(-3000) = 1000$
  */
  contract.getPNL = function(_user: string): int256 {
    let pnl: int256;
    if (this.virtualBalances[_user].uservAssetBalance.gt(0)) {
      const currentAssetValue: uint256 = this.getShortVusdAmountOut(
        uint256(this.virtualBalances[_user].uservAssetBalance)
      );
      pnl = int256(currentAssetValue).plus(this.virtualBalances[_user].uservUsdBalance);
    } else if (this.virtualBalances[_user].uservAssetBalance.lt(0)) {
      const currentAssetValue: uint256 = this.getLongVusdAmountOut(
        this.positive(this.virtualBalances[_user].uservAssetBalance)
      );
      pnl = this.virtualBalances[_user].uservUsdBalance.minus(int256(currentAssetValue));
    } else {
      pnl = int256(0);
    }
    return pnl;
  }

  //get user pnl by new pool size(new price);
  contract._getNewPNL = function(
    _user: string,
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): int256 {
    if (this.virtualBalances[_user].uservAssetBalance.gt(0)) {
      const k: uint256 = _vAssetNewPoolSize.multipliedBy(_vUsdNewPoolSize);
      const newvAssetPoolSize: uint256 = _vAssetNewPoolSize.plus(
        uint256(this.virtualBalances[_user].uservAssetBalance));
      const newvUsdPoolSize: uint256 = k.dividedBy(newvAssetPoolSize);
      const currentAssetValue: uint256 = _vUsdNewPoolSize.minus(newvUsdPoolSize);
      const pnl: int256 = int256(currentAssetValue).plus(this.virtualBalances[_user].uservUsdBalance);
      return pnl;
    } else if (this.virtualBalances[_user].uservAssetBalance.lt(0)) {
      const k: uint256 = _vAssetNewPoolSize.multipliedBy(_vUsdNewPoolSize);
      const newvAssetPoolSize: uint256 = _vAssetNewPoolSize.minus(
        this.positive(this.virtualBalances[_user].uservAssetBalance));
      const newvUsdPoolSize: uint256 = k.dividedBy(newvAssetPoolSize);
      const currentAssetValue: uint256 = newvUsdPoolSize.minus(_vUsdNewPoolSize);
      const pnl: int256 = this.virtualBalances[_user].uservUsdBalance.minus(int256(currentAssetValue));
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
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): int256 {
    const collateralValue: uint256 = this.collateral[this.usdc][_user];
    const pnl: int256 = this._getNewPNL(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    const fundingReward: int256 = this.virtualBalances[_user].virtualCollateral;
    const accountValue: int256 = int256(collateralValue).plus(pnl).plus(fundingReward);
    // int256 accountValue = int256(collateralValue);
    return accountValue;
  }

  //get total position value of each user
  contract.getPositionNotional = function(_user: string): uint256 {
    if (this.virtualBalances[_user].uservAssetBalance.gt(0)) {
      const positionNotionalValue: uint256 = this.getShortVusdAmountOut(
        uint256(this.virtualBalances[_user].uservAssetBalance)
      );
      return positionNotionalValue;
    } else if (this.virtualBalances[_user].uservAssetBalance.lt(0)) {
      const positionNotionalValue: uint256 = this.getLongVusdAmountOut(
        uint256(this.absoluteInt((this.virtualBalances[_user].uservAssetBalance)))
      );
      return positionNotionalValue;
    } else {
      return uint256(0);
    }
  }

  //get new position notional value according to the new pool size (new price)
  contract._getNewPositionNotional = function(
    _user: string,
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): uint256 {
    if (this.virtualBalances[_user].uservAssetBalance.gt(0)) {
      const k: uint256 = _vAssetNewPoolSize.multipliedBy(_vUsdNewPoolSize);
      const newvAssetPoolSize: uint256 = _vAssetNewPoolSize.plus(
        uint256(this.virtualBalances[_user].uservAssetBalance));
      const newvUsdPoolSize: uint256 = k.dividedBy(newvAssetPoolSize);
      const positionNotionalValue: uint256 = _vUsdNewPoolSize.minus(newvUsdPoolSize);
      return positionNotionalValue;
    } else if (this.virtualBalances[_user].uservAssetBalance.lt(0)) {
      const k: uint256 = _vAssetNewPoolSize.multipliedBy(_vUsdNewPoolSize);
      const newvAssetPoolSize: uint256 = _vAssetNewPoolSize.minus(
        this.positive(this.virtualBalances[_user].uservAssetBalance));
      const newvUsdPoolSize: uint256 = k.dividedBy(newvAssetPoolSize);
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
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): int256 {
    const accountValue: int256 = this._getNewAccountValue(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    const positionNotional: uint256 = this._getNewPositionNotional(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
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
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): boolean {
    const userMargin: int256 = this._userNewMargin(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    if (!userMargin.eq(0) && userMargin.lte(int256(this.AutoCloseMargin))) {
      return true;
    } else {
      return false;
    }
  }

  contract._isNewMarginLiquidatable = function(
    _user: string,
    _usdAmount: uint256,
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): boolean {
    const accountValue: int256 = this._getNewAccountValue(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    const positionNotional: uint256 = this._getNewPositionNotional(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
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
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): boolean {
    const userMargin: int256 = this._userNewMargin(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
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
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): Array<uint256> {
    Require(
      this._isHardLiquidatable(_user, _vAssetNewPoolSize, _vUsdNewPoolSize),
      "User is not hard liquidatable."
    );
    let vAssetNewPoolSize = _vAssetNewPoolSize;
    let vUsdNewPoolSize = _vUsdNewPoolSize;
    if (this.virtualBalances[_user].uservAssetBalance.gt(0)) {
      // _closeLongPosition(_user, uint256(uservAssetBalance[_user]));
      const _assetSize: uint256 = uint256(this.virtualBalances[_user].uservAssetBalance);
      const usdAssetValue: uint256 = this.getShortVusdAmountOut(_assetSize);
      //increase or decrease the user pnl for this function
      if (usdAssetValue.gt(this.positive(this.virtualBalances[_user].uservUsdBalance))) {
        const pnl: uint256 = usdAssetValue.minus(this.positive(this.virtualBalances[_user].uservUsdBalance));
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
      } else if (usdAssetValue.lt(this.positive(this.virtualBalances[_user].uservUsdBalance))) {
        const pnl: uint256 = this.positive(this.virtualBalances[_user].uservUsdBalance).minus(usdAssetValue);
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
      }
      //realize funding reward of user;
      const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
      if (!realizeVirtualCollAmount.eq(0)) {
        this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      this.virtualBalances[_user].uservAssetBalance = int256(0);
      this.virtualBalances[_user].uservUsdBalance = int256(0);
      // if user has not vbalance so he is not active
      this._removeActiveUser(_user);
      //update the pool
      let k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vAssetPoolSize = this.pool.vAssetPoolSize.plus(_assetSize);
      this.pool.vUsdPoolSize = k.dividedBy(this.pool.vAssetPoolSize);
      //update the new pool size
      k = vAssetNewPoolSize.multipliedBy(vUsdNewPoolSize);
      vAssetNewPoolSize = vAssetNewPoolSize.plus(_assetSize);
      vUsdNewPoolSize = k.dividedBy(vAssetNewPoolSize);
    } else if (this.virtualBalances[_user].uservAssetBalance.lt(0)) {
      const _assetSize: uint256 = this.positive(this.virtualBalances[_user].uservAssetBalance);
      const usdAssetValue: uint256 = this.getLongVusdAmountOut(_assetSize);
      //increase or decrease the user pnl for this function
      if (usdAssetValue.gt(uint256(this.virtualBalances[_user].uservUsdBalance))) {
        const pnl: uint256 = usdAssetValue.minus(this.positive(this.virtualBalances[_user].uservUsdBalance));
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
      } else if (usdAssetValue.lt(uint256(this.virtualBalances[_user].uservUsdBalance))) {
        const pnl: uint256 = this.positive(this.virtualBalances[_user].uservUsdBalance).minus(usdAssetValue);
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
      }
      //realize funding reward of user;
      const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
      if (!realizeVirtualCollAmount.eq(0)) {
        this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      this.virtualBalances[_user].uservAssetBalance = int256(0);
      this.virtualBalances[_user].uservUsdBalance = int256(0);
      // if user has not vbalance so he is not active
      this._removeActiveUser(_user);
      //update the pool
      let k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vAssetPoolSize = this.pool.vAssetPoolSize.minus(_assetSize);
      this.pool.vUsdPoolSize = k.dividedBy(this.pool.vAssetPoolSize);
      //update the new pool size
      k = vAssetNewPoolSize.multipliedBy(vUsdNewPoolSize);
      vAssetNewPoolSize = vAssetNewPoolSize.minus(_assetSize);
      vUsdNewPoolSize = k.dividedBy(vAssetNewPoolSize);
    }
    const collateralValue: uint256 = this.collateral[this.usdc][_user];
    const discountAmount: uint256 = (this.discountRate.multipliedBy(collateralValue)).dividedBy(100);
    this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(discountAmount);
    this.liquidationFee = this.liquidationFee.plus(discountAmount);

    return [
      vAssetNewPoolSize,
      vUsdNewPoolSize
    ];
  }

  //this contract.is called if user should be liquidated by new price
  contract._hardNegativeLiquidate = function(
    _user: string,
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): Array<uint256> {
    Require(
      this._isHardLiquidatable(_user, _vAssetNewPoolSize, _vUsdNewPoolSize),
      "User is not hard liquidatable."
    );
    let vAssetNewPoolSize = _vAssetNewPoolSize;
    let vUsdNewPoolSize = _vUsdNewPoolSize;
    if (this.virtualBalances[_user].uservAssetBalance.gt(0)) {
      const _assetSize: uint256 = uint256(this.virtualBalances[_user].uservAssetBalance);
      const negativeValue: int256 = this._getNewAccountValue(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);

      this.collateral[this.usdc][_user] = uint256(0);
      this.virtualBalances[_user].virtualCollateral = int256(0);
      //update user balance
      this.virtualBalances[_user].uservAssetBalance = int256(0);
      this.virtualBalances[_user].uservUsdBalance = int256(0);
      // if user has not vbalance so he is not active
      this._removeActiveUser(_user);
      //update the pool
      const k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vAssetPoolSize = this.pool.vAssetPoolSize.plus(_assetSize);
      this.pool.vUsdPoolSize = k.dividedBy(this.pool.vAssetPoolSize);
      //update the new pool size
      vAssetNewPoolSize = vAssetNewPoolSize.plus(_assetSize);
      vUsdNewPoolSize = k.dividedBy(vAssetNewPoolSize);
      // reduce short users virtual collateral
      const allShortAssetBalance: int256 = this.getAllShortvAssetBalance();
      for (let i = 0; i < this.activeUsers.length; i++) {
        const user: string = this.activeUsers[i];
        if (this.virtualBalances[_user].uservAssetBalance.lt(0)) {
          const liquidationCover: uint256 = (uint256(negativeValue).multipliedBy(
            this.positive(this.virtualBalances[_user].uservAssetBalance))).dividedBy(this.positive(allShortAssetBalance));
          this.virtualBalances[_user].virtualCollateral = this.virtualBalances[_user].virtualCollateral.minus(int256(liquidationCover));
        }
      }
    } else if (this.virtualBalances[_user].uservAssetBalance.lt(0)) {
      const _assetSize: uint256 = uint256(this.positive(this.virtualBalances[_user].uservAssetBalance));
      const negativeValue: int256 = this._getNewAccountValue(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);

      this.collateral[this.usdc][_user] = uint256(0);
      this.virtualBalances[_user].virtualCollateral = int256(0);

      //update user balance
      this.virtualBalances[_user].uservAssetBalance = int256(0);
      this.virtualBalances[_user].uservUsdBalance = int256(0);
      // if user has not vbalance so he is not active
      this._removeActiveUser(_user);
      //update the pool
      const k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vAssetPoolSize = this.pool.vAssetPoolSize.minus(_assetSize);
      this.pool.vUsdPoolSize = k.dividedBy(this.pool.vAssetPoolSize);
      //update the new pool size
      vAssetNewPoolSize = vAssetNewPoolSize.minus(_assetSize);
      vUsdNewPoolSize = k.dividedBy(vAssetNewPoolSize);
      // reduce long users virtual collateral
      const allLongvAssetBalance: int256 = this.getAllLongvAssetBalance();
      for (let i = 0; i < this.activeUsers.length; i++) {
        const user: string = this.activeUsers[i];
        if (this.virtualBalances[_user].uservAssetBalance.gt(0)) {
          const liquidationCover: uint256 = (uint256(negativeValue).multipliedBy(
            uint256(this.virtualBalances[_user].uservAssetBalance))).dividedBy(uint256(allLongvAssetBalance));
          this.virtualBalances[_user].virtualCollateral = this.virtualBalances[_user].virtualCollateral.minus(int256(liquidationCover));
        }
      }
    }

    return [
      vAssetNewPoolSize,
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
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): uint256 {
    const totalAccountValue: int256 = this._getNewAccountValue(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    const totalPositionNotional: uint256 = this._getNewPositionNotional(
      _user,
      _vAssetNewPoolSize,
      _vUsdNewPoolSize
    );
    const numerator: uint256 = (totalPositionNotional.multipliedBy(this.saveLevelMargin)).dividedBy(100).minus(
      this.positive(totalAccountValue));
    const denominator: uint256 = this.saveLevelMargin.minus(this.discountRate);
    const x: uint256 = (numerator.multipliedBy(100)).dividedBy(denominator);
    return x;
  }

  //get minimum long Asset amount that user receives
  contract.getMinimumLongAssetOut = function(_usdAmount: uint256): uint256 {
    let vAssetPoolSize: int256 = int256(this.pool.vAssetPoolSize);
    let vUsdPoolSize: int256 = int256(this.pool.vUsdPoolSize);
    let k: int256 = vAssetPoolSize.multipliedBy(vUsdPoolSize);
    let newvUsdPoolSize: int256 = vUsdPoolSize.plus(int256(_usdAmount));
    let newvAssetPoolSize: int256 = k.dividedBy(newvUsdPoolSize);

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isHardLiquidatable: boolean = this._isHardLiquidatable(
          this.activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          
          //update new pool
          k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
          newvAssetPoolSize = newvAssetPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservAssetBalance);
          newvUsdPoolSize = k.dividedBy(newvAssetPoolSize);
          //update pool
          k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
          vAssetPoolSize = vAssetPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservAssetBalance);
          vUsdPoolSize = k.dividedBy(vAssetPoolSize);
        }
      }
    }

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isPartialLiquidatable: boolean = this._isPartialLiquidatable(
          this.activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          const vUsdPartialLiquidateAmount: uint256 = this._calculatePartialLiquidateValue(
            this.activeUsers[i],
            uint256(newvAssetPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (this.virtualBalances[this.activeUsers[i]].uservAssetBalance.gt(0)) {
            //update new pool
            k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vAssetPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[this.activeUsers[i]].uservAssetBalance.lt(0)) {
            //update new pool
            k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            vAssetPoolSize = k.dividedBy(vUsdPoolSize);
          }
        }
      }
    }

    k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
    const finalvUsdPoolSize: int256 = vUsdPoolSize.plus(int256(_usdAmount));
    const finalvAssetPoolSize: int256 = k.dividedBy(finalvUsdPoolSize);
    const userAssetOut: int256 = vAssetPoolSize.minus(finalvAssetPoolSize);
    return uint256(userAssetOut);
  }

  //get minimum short Asset amount that user receives
  contract.getMinimumShortAssetOut = function(_usdAmount: uint256): uint256 {
    let vAssetPoolSize: int256 = int256(this.pool.vAssetPoolSize);
    let vUsdPoolSize: int256 = int256(this.pool.vUsdPoolSize);
    let k: int256 = vAssetPoolSize.multipliedBy(vUsdPoolSize);
    let newvUsdPoolSize: int256 = vUsdPoolSize.minus(int256(_usdAmount));
    let newvAssetPoolSize: int256 = k.dividedBy(newvUsdPoolSize);

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isHardLiquidatable: boolean = this._isHardLiquidatable(
          this.activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) { 
          //update new pool
          k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
          newvAssetPoolSize = newvAssetPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservAssetBalance);
          newvUsdPoolSize = k.dividedBy(newvAssetPoolSize);
          //update pool
          k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
          vAssetPoolSize = vAssetPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservAssetBalance);
          vUsdPoolSize = k.dividedBy(vAssetPoolSize);
          
        }
      }
    }
    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isPartialLiquidatable: boolean = this._isPartialLiquidatable(
          this.activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          
          const vUsdPartialLiquidateAmount: uint256 = this._calculatePartialLiquidateValue(
            this.activeUsers[i],
            uint256(newvAssetPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (this.virtualBalances[this.activeUsers[i]].uservAssetBalance.gt(0)) {
            //update new pool
            k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vAssetPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[this.activeUsers[i]].uservAssetBalance.lt(0)) {
            //update new pool
            k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            vAssetPoolSize = k.dividedBy(vUsdPoolSize);
          }
        }
      }
    }

    k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
    const finalvUsdPoolSize: int256 = vUsdPoolSize.minus(int256(_usdAmount));
    const finalvAssetPoolSize: int256 = k.dividedBy(finalvUsdPoolSize);
    const userAssetOut: int256 = finalvAssetPoolSize.minus(vAssetPoolSize);

    return uint256(userAssetOut);

  }


  //get minimum long usd amount that user receives
  contract.getMinimumLongUsdOut = function(_AssetAmount: uint256): uint256 {
    let vAssetPoolSize: int256 = int256(this.pool.vAssetPoolSize);
    let vUsdPoolSize: int256 = int256(this.pool.vUsdPoolSize);
    let k: int256 = vAssetPoolSize.multipliedBy(vUsdPoolSize);
    let newvAssetPoolSize: int256 = vAssetPoolSize.minus(int256(_AssetAmount));
    let newvUsdPoolSize: int256 = k.dividedBy(newvAssetPoolSize);


    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isHardLiquidatable: boolean = this._isHardLiquidatable(
          this.activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          
          //update new pool
          k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
          newvAssetPoolSize = newvAssetPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservAssetBalance);
          newvUsdPoolSize = k.dividedBy(newvAssetPoolSize);
          //update pool
          k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
          vAssetPoolSize = vAssetPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservAssetBalance);
          vUsdPoolSize = k.dividedBy(vAssetPoolSize);
        }
      }
    }

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isPartialLiquidatable: boolean = this._isPartialLiquidatable(
          this.activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          const vUsdPartialLiquidateAmount: uint256 = this._calculatePartialLiquidateValue(
            this.activeUsers[i],
            uint256(newvAssetPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (this.virtualBalances[this.activeUsers[i]].uservAssetBalance.gt(0)) {
            //update new pool
            k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vAssetPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[this.activeUsers[i]].uservAssetBalance.lt(0)) {
            //update new pool
            k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            vAssetPoolSize = k.dividedBy(vUsdPoolSize);
          }
        }
      }
    }


    k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
    const finalvAssetPoolSize: int256 = vAssetPoolSize.minus(int256(_AssetAmount));
    const finalvUsdPoolSize: int256 = k.dividedBy(finalvAssetPoolSize);
    const userUsdOut: int256 = finalvUsdPoolSize.minus(vUsdPoolSize);
    return uint256(userUsdOut);
  }


  //get minimum short usd amount that user receives
  contract.getMinimumShortUsdOut = function(_AssetAmount: uint256): uint256 {
    let vAssetPoolSize: int256 = int256(this.pool.vAssetPoolSize);
    let vUsdPoolSize: int256 = int256(this.pool.vUsdPoolSize);
    let k: int256 = vAssetPoolSize.multipliedBy(vUsdPoolSize);
    let newvAssetPoolSize: int256 = vAssetPoolSize.plus(int256(_AssetAmount));
    let newvUsdPoolSize: int256 = k.dividedBy(newvAssetPoolSize);

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isHardLiquidatable: boolean = this._isHardLiquidatable(
          this.activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          
          //update new pool
          k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
          newvAssetPoolSize = newvAssetPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservAssetBalance);
          newvUsdPoolSize = k.dividedBy(newvAssetPoolSize);
          //update pool
          k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
          vAssetPoolSize = vAssetPoolSize.plus(this.virtualBalances[this.activeUsers[i]].uservAssetBalance);
          vUsdPoolSize = k.dividedBy(vAssetPoolSize);
        }
      }
    }

    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isPartialLiquidatable: boolean = this._isPartialLiquidatable(
          this.activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          const vUsdPartialLiquidateAmount: uint256 = this._calculatePartialLiquidateValue(
            this.activeUsers[i],
            uint256(newvAssetPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (this.virtualBalances[this.activeUsers[i]].uservAssetBalance.gt(0)) {
            //update new pool
            k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.minus(int256(vUsdPartialLiquidateAmount));
            vAssetPoolSize = k.dividedBy(vUsdPoolSize);
          } else if (this.virtualBalances[this.activeUsers[i]].uservAssetBalance.lt(0)) {
            //update new pool
            k = newvAssetPoolSize.multipliedBy(newvUsdPoolSize);
            newvUsdPoolSize = newvUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            newvAssetPoolSize = k.dividedBy(newvUsdPoolSize);
            //update pool
            k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
            vUsdPoolSize = vUsdPoolSize.plus(int256(vUsdPartialLiquidateAmount));
            vAssetPoolSize = k.dividedBy(vUsdPoolSize);
          }
        }
      }
    }

    k = vAssetPoolSize.multipliedBy(vUsdPoolSize);
    const finalvAssetPoolSize: int256 = vAssetPoolSize.plus(int256(_AssetAmount));
    const finalvUsdPoolSize: int256 = k.dividedBy(finalvAssetPoolSize);
    const userUsdOut: int256 = vUsdPoolSize.minus(finalvUsdPoolSize);
    return uint256(userUsdOut);
  }

  //Liquidate user partialy according to the new price
  contract._partialLiquidate = function(
    _user: string,
    _vAssetNewPoolSize: uint256,
    _vUsdNewPoolSize: uint256
  ): Array<uint256> {
    Require(
      this._isPartialLiquidatable(_user, _vAssetNewPoolSize, _vUsdNewPoolSize),
      "user can not be partially liquidated"
    );
    let vAssetNewPoolSize = _vAssetNewPoolSize;
    let vUsdNewPoolSize = _vUsdNewPoolSize;

    const liquidateAmount: uint256 = this._calculatePartialLiquidateValue(
      _user,
      _vAssetNewPoolSize,
      _vUsdNewPoolSize
    );
    //uint AssetLiquidateAmount = liquidateAmount*this.pool.vAssetPoolSize/this.pool.vUsdPoolSize;
    // return AssetLiquidateAmount;
    if (this.virtualBalances[_user].uservAssetBalance.gt(0)) {
      // _closeLongPosition(_user, AssetLiquidateAmount);

      //get the output usd of closing position
      // const usdAssetValue: uint256 = getShortVusdAmountOut(AssetLiquidateAmount);
      const usdAssetValue: uint256 = liquidateAmount;
      const AssetLiquidateAmount: uint256 = this.getShortAssetAmountOut(usdAssetValue);
      const userPartialvUsdBalance: int256 = (this.virtualBalances[_user].uservUsdBalance.multipliedBy(
        int256(AssetLiquidateAmount))).dividedBy(this.virtualBalances[_user].uservAssetBalance);

      //increase or decrease the user pnl for this function
      if (usdAssetValue.gt(this.positive(userPartialvUsdBalance))) {
        const pnl: uint256 = usdAssetValue.minus(this.positive(userPartialvUsdBalance));
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
      } else if (usdAssetValue.lt(this.positive(userPartialvUsdBalance))) {
        const pnl: uint256 = this.positive(userPartialvUsdBalance).minus(usdAssetValue);
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
      }
      //realize funding reward of user;
      const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
      if (!realizeVirtualCollAmount.eq(0)) {
        this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      this.virtualBalances[_user].uservAssetBalance = this.virtualBalances[_user].uservAssetBalance.minus(int256(AssetLiquidateAmount));
      this.virtualBalances[_user].uservUsdBalance = this.virtualBalances[_user].uservUsdBalance.plus(this.absoluteInt(userPartialvUsdBalance));
      // if user has not vbalance so he is not active
      if (
        this.virtualBalances[_user].uservAssetBalance.eq(0) && this.virtualBalances[_user].uservUsdBalance.eq(0)
      ) {
        this._removeActiveUser(_user);
      }
      //update the pool
      const k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vAssetPoolSize = this.pool.vAssetPoolSize.plus(AssetLiquidateAmount);
      this.pool.vUsdPoolSize = k.dividedBy(this.pool.vAssetPoolSize);
      //update the newPoolSize
      vAssetNewPoolSize = vAssetNewPoolSize.plus(AssetLiquidateAmount);
      vUsdNewPoolSize = k.dividedBy(vAssetNewPoolSize);
    } else if (this.virtualBalances[_user].uservAssetBalance.lt(0)) {
      //get the output usd of closing position
      const usdAssetValue: uint256 = liquidateAmount;
      const AssetLiquidateAmount: uint256 = this.getLongAssetAmountOut(usdAssetValue);
      const userPartialvUsdBalance: int256 = (this.virtualBalances[_user].uservUsdBalance.multipliedBy(
        int256(AssetLiquidateAmount))).dividedBy(this.virtualBalances[_user].uservAssetBalance);
      //increase or decrease pnl of the user
      if (usdAssetValue.gt(uint256(this.positive(userPartialvUsdBalance)))) {
        const pnl: uint256 = usdAssetValue.minus(uint256(this.positive(userPartialvUsdBalance)));
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(pnl);
      }
      if (usdAssetValue.lt(this.positive(userPartialvUsdBalance))) {
        const pnl: uint256 = this.positive(userPartialvUsdBalance).minus(usdAssetValue);
        this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(pnl);
      }
      //realize funding reward of user;
      const realizeVirtualCollAmount: int256 = this.virtualBalances[_user].virtualCollateral;
      if (!realizeVirtualCollAmount.eq(0)) {
        this._realizevirtualCollateral(_user, this.absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      this.virtualBalances[_user].uservAssetBalance = this.virtualBalances[_user].uservAssetBalance.plus(int256(AssetLiquidateAmount));
      this.virtualBalances[_user].uservUsdBalance = this.virtualBalances[_user].uservUsdBalance.minus(this.absoluteInt(userPartialvUsdBalance));
      // if user has not vbalance so he is not active
      if (
        this.virtualBalances[_user].uservAssetBalance == 0 && this.virtualBalances[_user].uservUsdBalance == 0
      ) {
        this._removeActiveUser(_user);
      }
      //update pool
      const k2: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
      this.pool.vAssetPoolSize = this.pool.vAssetPoolSize.minus(AssetLiquidateAmount);
      this.pool.vUsdPoolSize = k2.dividedBy(this.pool.vAssetPoolSize);
      //update the newPoolSize
      vAssetNewPoolSize = vAssetNewPoolSize.minus(AssetLiquidateAmount);
      vUsdNewPoolSize = k2.dividedBy(vAssetNewPoolSize);
    }
    const discountAmount: uint256 = (liquidateAmount.multipliedBy(this.discountRate)).dividedBy(100);
    this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].minus(discountAmount);
    this.liquidationFee = this.liquidationFee.plus(discountAmount);

    return [
      vAssetNewPoolSize,
      vUsdNewPoolSize,
    ];
  }

  //liquidate users according to the new price (is used only in trade trade functions)
  contract._hardLiquidateUsers = function(_vAssetNewPoolSize: uint256, _vUsdNewPoolSize: uint256)
    : Array<uint256>
  {
    let vAssetNewPoolSize = _vAssetNewPoolSize;
    let vUsdNewPoolSize = _vUsdNewPoolSize;
    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isLiquidatable: boolean = this._isHardLiquidatable(
          this.activeUsers[i],
          vAssetNewPoolSize,
          vUsdNewPoolSize
        );
        if (isLiquidatable == true) {
          const userMargin: int256 = this._userNewMargin(this.activeUsers[i], vAssetNewPoolSize, vUsdNewPoolSize);
          if (userMargin.gt(0)) {
            [vAssetNewPoolSize, vUsdNewPoolSize] = this._hardLiquidate(
              this.activeUsers[i],
              vAssetNewPoolSize,
              vUsdNewPoolSize
            );
          } else if (userMargin.lt(0)) {
            [vAssetNewPoolSize, vUsdNewPoolSize] = this._hardNegativeLiquidate(
              this.activeUsers[i],
              vAssetNewPoolSize,
              vUsdNewPoolSize
            );
          }
        }
      }
    }

    return [
      vAssetNewPoolSize,
      vUsdNewPoolSize,
    ];
  }

  //liquidate users partialy according to the new price (is used only in trade trade functions)
  contract._partialLiquidateUsers = function(_vAssetNewPoolSize: uint256, _vUsdNewPoolSize: uint256)
    : Array<uint256>
  {
    let vAssetNewPoolSize = _vAssetNewPoolSize;
    let vUsdNewPoolSize = _vUsdNewPoolSize;
    for (let i = 0; i < this.activeUsers.length; i++) {
      if (this.activeUsers[i] != address(0)) {
        const isPartialLiquidatable: boolean = this._isPartialLiquidatable(
          this.activeUsers[i],
          vAssetNewPoolSize,
          vUsdNewPoolSize
        );
        if (isPartialLiquidatable == true) {
          [vAssetNewPoolSize, vUsdNewPoolSize] = this._partialLiquidate(
            this.activeUsers[i],
            vAssetNewPoolSize,
            vUsdNewPoolSize
          );
        }
      }
    }

    return [
      vAssetNewPoolSize,
      vUsdNewPoolSize,
    ];
  }

  contract.getAllLongvAssetBalance = function(): int256 {
    let allLongAssetBalance = int256(0);
    for (let i = 0; i < this.activeUsers.length; i++) {
      const user: string = this.activeUsers[i];
      const vAssetBalance: int256 = this.virtualBalances[user].uservAssetBalance;
      if (vAssetBalance.gt(0)) {
        allLongAssetBalance = allLongAssetBalance.plus(vAssetBalance);
      }
    }
    return allLongAssetBalance;
  }

  contract.getAllShortvAssetBalance = function(): int256 {
    let allShortAssetBalance = int256(0);
    for (let i = 0; i < this.activeUsers.length; i++) {
      const user: string = this.activeUsers[i];
      const vAssetBalance: int256 = this.virtualBalances[user].uservAssetBalance;
      if (vAssetBalance.lt(0)) {
        allShortAssetBalance = allShortAssetBalance.plus(vAssetBalance);
      }
    }
    return allShortAssetBalance;
  }

  contract.setFundingRate = function(){
    const currentPrice: uint256 = (this.pool.vUsdPoolSize.multipliedBy(1e18)).dividedBy(this.pool.vAssetPoolSize);
    const oraclePrice: uint256 = this.showPriceUSD();

    //first the contract check actual vAsset positions balance of users
    const allLongvAssetBalance: int256 = this.getAllLongvAssetBalance();
    const allShortAssetBalance: int256 = this.getAllShortvAssetBalance();

    //check if we dont have one side(long or short balance = 0) this funding action will not run
    if (allLongvAssetBalance.gt(0) && allShortAssetBalance.lt(0)) {
      if (currentPrice.gt(oraclePrice)) {
        const minOpenInterest: int256 = (
          this.absoluteInt(allLongvAssetBalance).gt(this.absoluteInt(allShortAssetBalance))
            ? this.absoluteInt(allShortAssetBalance)
            : this.absoluteInt(allLongvAssetBalance)
        );
        const difference: uint256 = currentPrice.minus(oraclePrice);
        const fundingFee: uint256 = (uint256(minOpenInterest).multipliedBy(difference)).dividedBy(24e18);
        for (let i = 0; i < this.activeUsers.length; i++) {
          const user: string = this.activeUsers[i];
          if (this.virtualBalances[user].uservAssetBalance.gt(0)) {
            //change vitraul collateral of user
            const userFundingFee: uint256 = (fundingFee.multipliedBy(
              uint256(this.virtualBalances[user].uservAssetBalance))).dividedBy(uint256(allLongvAssetBalance));
            this.virtualBalances[user].virtualCollateral = this.virtualBalances[user].virtualCollateral.minus(int256(userFundingFee));
          } else if (this.virtualBalances[user].uservAssetBalance.lt(0)) {
            //change vitraul collateral of user
            const userFundingFee: uint256 = (fundingFee.multipliedBy(
              this.positive(this.virtualBalances[user].uservAssetBalance))).dividedBy(this.positive(allShortAssetBalance));
            this.virtualBalances[user].virtualCollateral = this.virtualBalances[user].virtualCollateral.plus(int256(userFundingFee));
          }
        }
      } else if (currentPrice.lt(oraclePrice)) {
        const minOpenInterest: int256 = (
          this.absoluteInt(allLongvAssetBalance).gt(this.absoluteInt(allShortAssetBalance))
            ? this.absoluteInt(allShortAssetBalance)
            : this.absoluteInt(allLongvAssetBalance)
        );
        const difference: uint256 = oraclePrice.minus(currentPrice);
        const fundingFee: uint256 = (uint256(minOpenInterest).multipliedBy(difference)).dividedBy(24e18);
        for (let i = 0; i < this.activeUsers.length; i++) {
          const user: string = this.activeUsers[i];
          if (this.virtualBalances[user].uservAssetBalance.gt(0)) {
            //change vitraul collateral of user
            const userFundingFee: uint256 = (fundingFee.multipliedBy(
              uint256(this.virtualBalances[user].uservAssetBalance))).dividedBy(uint256(allLongvAssetBalance));
            this.virtualBalances[user].virtualCollateral = this.virtualBalances[user].virtualCollateral.plus(int256(userFundingFee));
          } else if (this.virtualBalances[user].uservAssetBalance.lt(0)) {
            //change vitraul collateral of user
            const userFundingFee: uint256 = (fundingFee.multipliedBy(
              this.positive(this.virtualBalances[user].uservAssetBalance))).dividedBy(this.positive(allShortAssetBalance));
            this.virtualBalances[user].virtualCollateral = this.virtualBalances[user].virtualCollateral.minus(int256(userFundingFee));
          }
        }
      }
    }
  }

  //return positive int
  contract.absoluteInt = function(_value: int256): int256 {
    if (_value.lt(0)) {
      return _value.negated();
    } else {
      return _value;
    }
  }

  //return false if new price go further than the oracle price
  contract.isPriceIntheRightRange = function(_vAssetNewPoolSize: uint256, _vUsdNewPoolSize: uint256): boolean
  {
    const currentPrice: uint256 = (this.pool.vUsdPoolSize.multipliedBy(1e18)).dividedBy(this.pool.vAssetPoolSize);
    const oraclePrice: uint256 = this.showPriceUSD();
    const newPrice: uint256 = (_vUsdNewPoolSize.multipliedBy(1e18)).dividedBy(_vAssetNewPoolSize);

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
  contract.removeLiquidationFee = function(_amount: uint256) {
    Require(
      _amount.lte(this.liquidationFee),
      "Requested collect amount is largser than the ContractFee balance."
    );
    SafeERC20.safeTransfer(IERC20(this.usdc), msg.sender, _amount);
    this.liquidationFee = this.liquidationFee.minus(_amount);
  }

  contract.isLongInRightRange = function(_usdAmount: uint256): boolean {
    const k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.plus(_usdAmount);
    let newvAssetPoolSize: uint256 = k.dividedBy(newvUsdPoolSize);
    const isInTheRightRange: boolean = this.isPriceIntheRightRange(newvAssetPoolSize, newvUsdPoolSize);
    return isInTheRightRange;
  }

  contract.isShortInRightRange = function(_usdAmount: uint256): boolean {
    const k: uint256 = this.pool.vAssetPoolSize.multipliedBy(this.pool.vUsdPoolSize);
    let newvUsdPoolSize: uint256 = this.pool.vUsdPoolSize.minus(_usdAmount);
    let newvAssetPoolSize: uint256 = k.dividedBy(newvUsdPoolSize);
    const isInTheRightRange: boolean = this.isPriceIntheRightRange(newvAssetPoolSize, newvUsdPoolSize);
    return isInTheRightRange;
  }

  contract.marketPrice = function(): uint256 {
    return (this.pool.vUsdPoolSize.multipliedBy(1e18)).dividedBy(this.pool.vAssetPoolSize);
  }

  return contract;
}