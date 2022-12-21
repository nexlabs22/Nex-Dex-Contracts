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

  contract.collateral = {} as AddressToAddressToUint256; //collateral[tokenaddress][useraddress]
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
    // TODO: msg.sender
    // SafeERC20.safeTransferFrom(IERC20(this.usdc), msg.sender, address(0), _amount);
    // this.collateral[this.usdc][msg.sender] = this.collateral[this.usdc][msg.sender].add(_amount);
    // emit Deposit(usdc, msg.sender, _amount, collateral[usdc][msg.sender]);
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
    // emit Withdraw(usdc, msg.sender, _amount, collateral[usdc][msg.sender]);
  }

  //give the user funding reward when position will be closed
  contract._realizevirtualCollateral = function(_user: string, _amount: int256) {
    Require(
      _amount.lte(this.absoluteInt(this.virtualBalances[_user].virtualCollateral)),
      "Requested amount is larger than the virtual collateral balance."
    );
    if (this.virtualBalances[_user].virtualCollateral > 0) {
      this.collateral[this.usdc][_user] = this.collateral[this.usdc][_user].plus(uint256(_amount));
      this.virtualBalances[_user].virtualCollateral = this.virtualBalances[_user].virtualCollateral.minus(_amount);
    } else if (this.virtualBalances[_user].virtualCollateral < 0) {
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

  return contract;
}