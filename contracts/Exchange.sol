// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "./ExchangeInfo.sol";

// @title Nex Exchange smart contract

contract Exchange is Ownable, ReentrancyGuard, Pausable {
  using SafeMath for uint256;
  
  
  ExchangeInfo public exchangeInfo;

  address public usdc;

  bool public poolInitialized; // is pool initialized

  uint256 public insuranceFunds;

  uint8 public discountRate = 20; //20%
  uint8 public saveLevelMargin = 60; //60%
  uint8 public maintenanceMargin = 50; //50%
  uint8 public AutoCloseMargin = 40; //40%

  uint8 public swapFee = 10; //=> 10/10000 = 0.1%
  uint256 public latestFeeUpdate;

  uint lastSetFundingRateTime;
  bool tradingLimit;

  struct Pool {
    uint256 vBaycPoolSize;
    uint256 vUsdPoolSize;
  }

  Pool public pool;

  struct VirtualBalance {
    int256 virtualCollateral; //funding reward of each user
    int256 uservUsdBalance; // virtual usd balance of each user;
    int256 uservBaycBalance; // virtual nft balance of each user;
  }

  address[] public activeUsers;

  mapping(address => mapping(address => uint256)) public collateral; //collateral[tokenaddress][useraddress]
  mapping(address => VirtualBalance) public virtualBalances;
  mapping(address => bool) public isUserActive;

  
  event NewOracle(address oracle);
  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);

  event OpenLongPosition(address user, uint256 price, uint256 timestamp, uint256 vBaycAmount, uint256 vUsdAmount);
  event OpenShortPosition(address user, uint256 price, uint256 timestamp, uint256 vBaycAmount, uint256 vUsdAmount);
  event CloseLongPosition(address user, uint256 price, uint256 timestamp, uint256 vBaycAmount, uint256 vUsdAmount);
  event CloseShortPosition(address user, uint256 price, uint256 timestamp, uint256 vBaycAmount, uint256 vUsdAmount);

  event HardLiquidate(address user, uint price, uint timestamp, uint vBaycAmount, uint vUsdAmount);
  event PartialLiquidate(address user, uint price, uint timestamp, uint vBaycAmount, uint vUsdAmount);

  event Price(uint price, uint volume, uint timestamp, uint vBaycPoolSize, uint vUsdPoolSize);

  constructor(
    address _usdc
  ) {
    usdc = _usdc;
  }

  //return bayc virtual pool size of the market
  function vBaycPoolSize() public view returns (uint256) {
    return pool.vBaycPoolSize;
  }

  //return usd virtual pool size of the market
  function vUsdPoolSize() public view returns (uint256) {
    return pool.vUsdPoolSize;
  }

  //return virtual collateral of each user
  function virtualCollateral(address _user) public view returns (int256) {
    return virtualBalances[_user].virtualCollateral;
  }

  //return virtual usd balance of each user
  function uservUsdBalance(address _user) public view returns (int256) {
    return virtualBalances[_user].uservUsdBalance;
  }

  //return virtual bayc balance of each user
  function uservBaycBalance(address _user) public view returns (int256) {
    return virtualBalances[_user].uservBaycBalance;
  }

  function setExchangeInfo(address _exchangeInfo) public onlyOwner {
    require(_exchangeInfo != address(0), "New exchange info address can not be a zero address");
    exchangeInfo = ExchangeInfo(_exchangeInfo);
  }

  function lastFundingRateAmount() public view returns (int256) {
    return exchangeInfo.lastFundingRateAmount();
  }

  function lastFundingRateTime() public view returns (uint256) {
    return exchangeInfo.lastFundingRateTime();
  }

  function oraclePrice() public view returns (uint256) {
    return exchangeInfo.oraclePrice();
  }

  

  //check is user exist in activeUsers array
  function doesUserExist(address _user) public view returns (bool) {
    return isUserActive[_user];
  }

  //add user to the active user list (first check if its not)
  function _addActiveUser(address _user) internal {
    bool isExist = doesUserExist(_user);
    if (isExist == false) {
      isUserActive[_user] = true;
      activeUsers.push(_user);
    }
  }

  //remove user from active users list
  function _removeActiveUser(address _user) internal {
    bool isExist = doesUserExist(_user);
    if (isExist == true) {
      for (uint256 i; i < activeUsers.length; i++) {
        if (activeUsers[i] == _user) {
          isUserActive[_user] = false;
          delete activeUsers[i];
        }
      }
    }
  }

  //return all active users in one array
  function getAllActiveUsers() public view returns (address[] memory) {
    return activeUsers;
  }

  //create the pool
  //for this time owner can do it
  function initialVirtualPool(uint256 _assetSize) public onlyOwner {
    require(poolInitialized == false, "You cannot initialize pool again");
    uint256 oraclePrice = exchangeInfo.oraclePrice();
    pool.vBaycPoolSize = _assetSize;
    pool.vUsdPoolSize = (_assetSize * oraclePrice) / 1e18;
    poolInitialized = true;
  }


  //Notice: newFee should be between 1 to 100 (0.01% - 1%)
  function setSwapFee(uint8 _newFee) public onlyOwner {
    uint256 distance = block.timestamp - latestFeeUpdate;
    require(distance / 60 / 60 > 12, "You should wait at least 12 hours after the latest update");
    require(_newFee <= 100 && _newFee >= 1, "The newFee should be between 1 and 100 (0.01% - 1%)");
    swapFee = _newFee;
    latestFeeUpdate = block.timestamp;
  }

  function setTradingLimit(bool _enabled) public onlyOwner {
    tradingLimit = _enabled;
  }

  //deposit collateral
  function depositCollateral(uint256 _amount) public {
    SafeERC20.safeTransferFrom(IERC20(usdc), msg.sender, address(this), _amount);
    collateral[usdc][msg.sender] = collateral[usdc][msg.sender].add(_amount);
    emit Deposit(usdc, msg.sender, _amount, collateral[usdc][msg.sender]);
  }

  //withdraw collateral
  //befor that the function check user margin
  function withdrawCollateral(uint256 _amount) public {
    //check new margin
    uint256 totalPositionNotional = getPositionNotional(msg.sender);
    int256 totalAccountValue = getAccountValue(msg.sender);
    if (totalPositionNotional > 0) {
      int256 newAccountValue = totalAccountValue - int256(_amount);
      int256 newMargin = (100 * newAccountValue) / int256(totalPositionNotional);
      require(
        newMargin > int8(saveLevelMargin),
        "You cannot withdraw because your margin is lower than the saveMargin level"
      );
    }
    //check user has enough collateral
    require(
      collateral[usdc][msg.sender] >= _amount,
      "Requested withdrawal amount is larger than the collateral balance."
    );
    //transfer tokens to the user
    SafeERC20.safeTransfer(IERC20(usdc), msg.sender, _amount);
    collateral[usdc][msg.sender] = collateral[usdc][msg.sender].sub(_amount);
    emit Withdraw(usdc, msg.sender, _amount, collateral[usdc][msg.sender]);
  }

  //give the user funding reward when position will be closed
  function _realizevirtualCollateral(address _user, int256 _amount) internal {
    require(
      _amount <= absoluteInt(virtualBalances[_user].virtualCollateral),
      "Requested amount is larger than the virtual collateral balance."
    );
    if (virtualBalances[_user].virtualCollateral > 0) {
      collateral[usdc][_user] += uint256(_amount);
      virtualBalances[_user].virtualCollateral -= _amount;
    } else if (virtualBalances[_user].virtualCollateral < 0) {
      collateral[usdc][_user] -= uint256(_amount);
      virtualBalances[_user].virtualCollateral += _amount;
    }
  }

  //get output Bayc by usd input amount if we want to buy(long)
  //how much Bayc we will get by paying usd for long
  function getLongBaycAmountOut(uint256 _vUsdAmount) public view returns (uint256) {
    uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize + _vUsdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = pool.vBaycPoolSize - newvBaycPoolSize;
    return userBayc;
  }

  //get output usd amount by Bayc input amount if we want to buy(long)
  function getLongVusdAmountOut(uint256 _vBaycAmount) public view returns (uint256) {
    uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    uint256 newvBaycPoolSize = pool.vBaycPoolSize - _vBaycAmount;
    uint256 newvUsdPoolSize = k / newvBaycPoolSize;
    uint256 uservUsd = newvUsdPoolSize - pool.vUsdPoolSize;
    return uservUsd;
  }

  //get output Bayc by usd input amount if we want to sell(short)
  function getShortBaycAmountOut(uint256 _vUsdAmount) public view returns (uint256) {
    uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize - _vUsdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = newvBaycPoolSize - pool.vBaycPoolSize;
    return userBayc;
  }

  //get output usd by Bayc input amount if we want to sell(short)
  function getShortVusdAmountOut(uint256 _vBaycAmount) public view returns (uint256) {
    uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    uint256 newvBaycPoolSize = pool.vBaycPoolSize + _vBaycAmount;
    uint256 newvUsdPoolSize = k / newvBaycPoolSize;
    uint256 uservUsd = pool.vUsdPoolSize - newvUsdPoolSize;
    return uservUsd;
  }

  //I use int for negative/positve numbers for user bayc and usd balance(wich might be negative)
  //so for some point we need to convert them to uint so they should be positive
  //f.e positive(-1)=1
  function positive(int256 _amount) public pure returns (uint256) {
    if (_amount < 0) {
      int256 posAmount = -(_amount);
      return uint256(posAmount);
    } else {
      return uint256(_amount);
    }
  }

  

  function getCurrentExchangePrice() public view returns (uint256) {
    return (1e18 * pool.vUsdPoolSize) / pool.vBaycPoolSize;
  }
  
  
  function openLongPosition(uint256 _usdAmount, uint256 _minimumBaycAmountOut) public {
    //calculate the new pool size and user bayc amount
    uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize + _usdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    if(tradingLimit){
    bool isInTheRightRange = isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    require(
      isInTheRightRange == true,
      "You can't move the price more than 10% away from the oracle price."
    );
    }
    bool isNewMarginHardLiquidatable = _isNewMarginLiquidatable(
      msg.sender,
      _usdAmount,
      newvBaycPoolSize,
      newvUsdPoolSize
    );
    require(
      isNewMarginHardLiquidatable == false,
      "Insufficient margin to open position with requested size."
    );

    //first we run liquidation functions
    (newvBaycPoolSize, newvUsdPoolSize) = _hardLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);
    (newvBaycPoolSize, newvUsdPoolSize) = _partialLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);
    

    k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    newvUsdPoolSize = pool.vUsdPoolSize + _usdAmount;
    newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = pool.vBaycPoolSize - newvBaycPoolSize;
    require(userBayc >= _minimumBaycAmountOut, "INSUFFICIENT_OUTPUT_AMOUNT");
    //update bayc and usd balance of user
    virtualBalances[msg.sender].uservBaycBalance += int256(userBayc);
    virtualBalances[msg.sender].uservUsdBalance -= int256(_usdAmount);

    //add user to the active user list
    _addActiveUser(msg.sender);

    //trade fee
    uint256 fee = (_usdAmount * swapFee) / 10000;
    collateral[usdc][msg.sender] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);

    //update pool
    pool.vBaycPoolSize = newvBaycPoolSize;
    pool.vUsdPoolSize = newvUsdPoolSize;

    //set the event
    emit OpenLongPosition(msg.sender, marketPrice(), block.timestamp, userBayc, _usdAmount);
    emit Price(marketPrice(), userBayc, block.timestamp, pool.vBaycPoolSize, pool.vUsdPoolSize);
  }
  

  function openShortPosition(uint256 _usdAmount, uint256 _minimumBaycAmountOut) public {
    //calculate the new pool size and user bayc amount
    uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize - _usdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    if(tradingLimit){
    bool isInTheRightRange = isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    require(
      isInTheRightRange == true,
      "You can't move the price more than 10% away from the oracle price."
    );
    }
    bool isNewMarginHardLiquidatable = _isNewMarginLiquidatable(
      msg.sender,
      _usdAmount,
      newvBaycPoolSize,
      newvUsdPoolSize
    );
    require(
      isNewMarginHardLiquidatable == false,
      "Insufficient margin to open position with requested size."
    );

    //first we run liquidation functions
    (newvBaycPoolSize, newvUsdPoolSize) = _hardLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);
    (newvBaycPoolSize, newvUsdPoolSize) = _partialLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);
    

    k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    newvUsdPoolSize = pool.vUsdPoolSize - _usdAmount;
    newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = newvBaycPoolSize - pool.vBaycPoolSize;
    require(userBayc >= _minimumBaycAmountOut, "INSUFFICIENT_OUTPUT_AMOUNT");
    //update bayc and usd balance of user
    virtualBalances[msg.sender].uservBaycBalance -= int256(userBayc);
    virtualBalances[msg.sender].uservUsdBalance += int256(_usdAmount);

    //add user to the active user list
    _addActiveUser(msg.sender);

    //trade fee
    uint256 fee = (_usdAmount * swapFee) / 10000;
    collateral[usdc][msg.sender] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);

    //update pool
    pool.vBaycPoolSize = newvBaycPoolSize;
    pool.vUsdPoolSize = newvUsdPoolSize;

    //set the event
    emit OpenShortPosition(msg.sender, marketPrice(), block.timestamp, userBayc, _usdAmount);
    emit Price(marketPrice(), userBayc, block.timestamp, pool.vBaycPoolSize, pool.vUsdPoolSize);
  }

  function _closeLongPosition(address _user, uint256 _assetSize, uint256 _minimumUsdOut) internal {
    require(
      _assetSize <= positive(virtualBalances[_user].uservBaycBalance),
      "Reduce only order can only close long size equal or less than the outstanding asset size."
    );

    uint256 k;
    //first we run liquidation functions
    k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    uint256 vBaycNewPoolSize = pool.vBaycPoolSize + _assetSize;
    uint256 vUsdNewPoolSize = k / vBaycNewPoolSize;

    //liquidate users
    (vBaycNewPoolSize, vUsdNewPoolSize) = _hardLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);
    (vBaycNewPoolSize, vUsdNewPoolSize) = _partialLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);

    //get the output usd of closing position
    //f.e 1Bayc -> 2000$
    uint256 usdBaycValue = getShortVusdAmountOut(_assetSize);
    require(usdBaycValue >= _minimumUsdOut, "INSUFFICIENT_OUTPUT_AMOUNT");
    int256 userPartialvUsdBalance = (virtualBalances[_user].uservUsdBalance * int256(_assetSize)) /
      virtualBalances[_user].uservBaycBalance;

    //increase or decrease the user pnl for this function
    if (usdBaycValue > uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = usdBaycValue - uint256(positive(userPartialvUsdBalance));
      // collateral[usdc][_user] += pnl;
      collateral[usdc][_user] += pnl;
    } else if (usdBaycValue < uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = uint256(positive(userPartialvUsdBalance) - usdBaycValue);
      collateral[usdc][_user] -= pnl;
    }
    //realize funding reward of user;
    int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
    if (realizeVirtualCollAmount != 0) {
      _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
    }
    //update user balance
    virtualBalances[_user].uservBaycBalance -= int256(_assetSize);
    virtualBalances[_user].uservUsdBalance += absoluteInt(userPartialvUsdBalance);
    // if user has not vbalance so he is not active
    if (
      virtualBalances[_user].uservBaycBalance == 0 && virtualBalances[_user].uservUsdBalance == 0
    ) {
      _removeActiveUser(_user);
    }

    //trade fee
    uint256 fee = (usdBaycValue * swapFee) / 10000;
    collateral[usdc][_user] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);

    //update the pool
    k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    pool.vBaycPoolSize += _assetSize;
    pool.vUsdPoolSize = k / pool.vBaycPoolSize;

    //set event
    emit CloseLongPosition(msg.sender, marketPrice(), block.timestamp, _assetSize, positive(userPartialvUsdBalance));
    emit Price(marketPrice(), _assetSize, block.timestamp, pool.vBaycPoolSize, pool.vUsdPoolSize);
  }

  function _closeShortPosition(address _user, uint256 _assetSize, uint256 _minimumUsdOut) internal {
    require(
      _assetSize <= positive(virtualBalances[_user].uservBaycBalance),
      "Reduce only order can only close short size equal or less than the outstanding asset size."
    );

    uint256 k;
    //first we run liquidation functions
    k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    uint256 vBaycNewPoolSize = pool.vBaycPoolSize - _assetSize;
    uint256 vUsdNewPoolSize = k / vBaycNewPoolSize;


    //liquidate users
    (vBaycNewPoolSize, vUsdNewPoolSize) = _hardLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);
    (vBaycNewPoolSize, vUsdNewPoolSize) = _partialLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);
    
    //get the output usd of closing position
    uint256 usdBaycValue = getLongVusdAmountOut(_assetSize);
    require(usdBaycValue >= _minimumUsdOut, "INSUFFICIENT_OUTPUT_AMOUNT");

    int256 userPartialvUsdBalance = (virtualBalances[_user].uservUsdBalance * int256(_assetSize)) /
      virtualBalances[_user].uservBaycBalance;
    //increase or decrease pnl of the user
    if (usdBaycValue > uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = usdBaycValue - uint256(positive(userPartialvUsdBalance));
      collateral[usdc][_user] -= pnl;
    }
    if (usdBaycValue < uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = uint256(positive(userPartialvUsdBalance) - usdBaycValue);
      collateral[usdc][_user] += pnl;
    }
    //realize funding reward of user;
    int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
    if (realizeVirtualCollAmount != 0) {
      _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
    }
    //update user balance
    virtualBalances[_user].uservBaycBalance += int256(_assetSize);
    virtualBalances[_user].uservUsdBalance -= absoluteInt(userPartialvUsdBalance);
    // if user has not vbalance so he is not active
    if (
      virtualBalances[_user].uservBaycBalance == 0 && virtualBalances[_user].uservUsdBalance == 0
    ) {
      _removeActiveUser(_user);
    }
    //trade fee
    uint256 fee = (usdBaycValue * swapFee) / 10000;
    collateral[usdc][_user] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);
    //update pool
    k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    pool.vBaycPoolSize -= _assetSize;
    pool.vUsdPoolSize = k / pool.vBaycPoolSize;

    //set event
    emit CloseShortPosition(msg.sender, marketPrice(), block.timestamp, _assetSize, positive(userPartialvUsdBalance));
    emit Price(marketPrice(), _assetSize, block.timestamp, pool.vBaycPoolSize, pool.vUsdPoolSize);
  }

  function closePositionComplete(uint256 _minimumUsdOut) public {
    uint256 assetSize = positive(virtualBalances[msg.sender].uservBaycBalance);
    closePosition(assetSize, _minimumUsdOut);
  }

  function closePosition(uint256 _assetSize, uint256 _minimumUsdOut) public {
    require(
      _assetSize <= positive(virtualBalances[msg.sender].uservBaycBalance),
      "Reduce only order can only close size equal or less than the outstanding asset size."
    );
    //if user has positive vBayc balance so he/she has longPosition
    //if user has negative vBayc balance so he/she has shortPosition
    if (virtualBalances[msg.sender].uservBaycBalance > 0) {
      _closeLongPosition(msg.sender, _assetSize, _minimumUsdOut);
    } else if (virtualBalances[msg.sender].uservBaycBalance < 0) {
      _closeShortPosition(msg.sender, _assetSize, _minimumUsdOut);
    }
  }

  //return the pnl of user
  function getPNL(address _user) public view returns (int256 pnl) {
    if (virtualBalances[_user].uservBaycBalance > 0) {
      uint256 currentBaycValue = getShortVusdAmountOut(
        uint256(virtualBalances[_user].uservBaycBalance)
      );
      pnl = int256(currentBaycValue) + (virtualBalances[_user].uservUsdBalance);
    } else if (virtualBalances[_user].uservBaycBalance < 0) {
      uint256 currentBaycValue = getLongVusdAmountOut(
        positive(virtualBalances[_user].uservBaycBalance)
      );
      pnl = virtualBalances[_user].uservUsdBalance - int256(currentBaycValue);
    } else {
      pnl = 0;
    }
  }

  //get user pnl by new pool size(new price);
  function _getNewPNL(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (int256) {
    if (virtualBalances[_user].uservBaycBalance > 0) {
      uint256 k = _vBaycNewPoolSize * _vUsdNewPoolSize;
      uint256 newvBaycPoolSize = _vBaycNewPoolSize +
        uint256(virtualBalances[_user].uservBaycBalance);
      uint256 newvUsdPoolSize = k / newvBaycPoolSize;
      uint256 currentBaycValue = _vUsdNewPoolSize - newvUsdPoolSize;
      int256 pnl = int256(currentBaycValue) + (virtualBalances[_user].uservUsdBalance);
      return pnl;
    } else if (virtualBalances[_user].uservBaycBalance < 0) {
      uint256 k = _vBaycNewPoolSize * _vUsdNewPoolSize;
      uint256 newvBaycPoolSize = _vBaycNewPoolSize -
        positive(virtualBalances[_user].uservBaycBalance);
      uint256 newvUsdPoolSize = k / newvBaycPoolSize;
      uint256 currentBaycValue = newvUsdPoolSize - _vUsdNewPoolSize;
      int256 pnl = virtualBalances[_user].uservUsdBalance - int256(currentBaycValue);
      return pnl;
    }
  }

  //account value = collateral +- pnl
  function getAccountValue(address _user) public view returns (int256) {
    uint256 collateralValue = collateral[usdc][_user];
    int256 pnl = getPNL(_user);
    int256 fundingReward = virtualBalances[_user].virtualCollateral;
    int256 accountValue = int256(collateralValue) + pnl + fundingReward;
    return accountValue;
  }

  //get new account value according to the new pool size (new price)
  function _getNewAccountValue(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (int256) {
    uint256 collateralValue = collateral[usdc][_user];
    int256 pnl = _getNewPNL(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    int256 fundingReward = virtualBalances[_user].virtualCollateral;
    int256 accountValue = int256(collateralValue) + pnl + fundingReward;
    // int256 accountValue = int256(collateralValue);
    return accountValue;
  }

  //get total position value of each user
  function getPositionNotional(address _user) public view returns (uint256) {
    if (virtualBalances[_user].uservBaycBalance > 0) {
      uint256 positionNotionalValue = getShortVusdAmountOut(
        uint256(virtualBalances[_user].uservBaycBalance)
      );
      return positionNotionalValue;
    } else if (virtualBalances[_user].uservBaycBalance < 0) {
      uint256 positionNotionalValue = getLongVusdAmountOut(
        uint256(absoluteInt((virtualBalances[_user].uservBaycBalance)))
      );
      return positionNotionalValue;
    } else {
      return 0;
    }
  }

  //get new position notional value according to the new pool size (new price)
  function _getNewPositionNotional(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (uint256) {
    if (virtualBalances[_user].uservBaycBalance > 0) {
      uint256 k = _vBaycNewPoolSize * _vUsdNewPoolSize;
      uint256 newvBaycPoolSize = _vBaycNewPoolSize +
        uint256(virtualBalances[_user].uservBaycBalance);
      uint256 newvUsdPoolSize = k / newvBaycPoolSize;
      uint256 positionNotionalValue = _vUsdNewPoolSize - newvUsdPoolSize;
      return positionNotionalValue;
    } else if (virtualBalances[_user].uservBaycBalance < 0) {
      uint256 k = _vBaycNewPoolSize * _vUsdNewPoolSize;
      uint256 newvBaycPoolSize = _vBaycNewPoolSize -
        positive(virtualBalances[_user].uservBaycBalance);
      uint256 newvUsdPoolSize = k / newvBaycPoolSize;
      uint256 positionNotionalValue = newvUsdPoolSize - _vUsdNewPoolSize;
      return positionNotionalValue;
    } else {
      return 0;
    }
  }

  function userMargin(address _user) public view returns (int256) {
    int256 accountValue = getAccountValue(_user);
    uint256 positionNotional = getPositionNotional(_user);
    if (accountValue != 0 && positionNotional > 0) {
      int256 margin = (100 * accountValue) / int256(positionNotional);
      return margin;
    } else {
      return 0;
    }
  }

  //get the new margin of user according to the new pool size (new price)
  function _userNewMargin(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (int256) {
    int256 accountValue = _getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    uint256 positionNotional = _getNewPositionNotional(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    if (accountValue != 0 && positionNotional > 0) {
      int256 margin = (100 * accountValue) / int256(positionNotional);
      return margin;
    } else {
      return 0;
    }
  }

  function isHardLiquidatable(address _user) public view returns (bool) {
    int256 userMargin = userMargin(_user);
    if (userMargin != 0 && userMargin <= int8(AutoCloseMargin)) {
      return true;
    } else {
      return false;
    }
  }

  //ckeck that is user can be liquidated according to the new price
  function _isHardLiquidatable(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (bool) {
    int256 userMargin = _userNewMargin(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    if (userMargin != 0 && userMargin <= int8(AutoCloseMargin)) {
      return true;
    } else {
      return false;
    }
  }

  function _isNewMarginLiquidatable(
    address _user,
    uint256 _usdAmount,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (bool) {
    int256 accountValue = _getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    uint256 positionNotional = _getNewPositionNotional(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    uint256 newPositionNotional = positionNotional + _usdAmount;
    int256 newMargin = (100 * (accountValue)) / int256(newPositionNotional);
    if (newMargin != 0 && newMargin <= int8(saveLevelMargin)) {
      return true;
    } else {
      return false;
    }
  }

  function isPartialLiquidatable(address _user) public view returns (bool) {
    int256 userMargin = userMargin(_user);
    if (int8(AutoCloseMargin) <= userMargin && userMargin <= int8(maintenanceMargin)) {
      return true;
    } else {
      return false;
    }
  }

  //ckeck that is user can be partialy liquidated according to the new price
  function _isPartialLiquidatable(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (bool) {
    int256 userMargin = _userNewMargin(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    // if ( 40 < userMargin < 50 ) => user is partial liquidatable
    if (int8(AutoCloseMargin) <= userMargin && userMargin <= int8(maintenanceMargin)) {
      return true;
    } else {
      return false;
    }
  }

  //this function is called if user should be liquidated by new price
  function _hardLiquidate(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal returns (uint256 vBaycNewPoolSize, uint256 vUsdNewPoolSize) {
    require(
      _isHardLiquidatable(_user, _vBaycNewPoolSize, _vUsdNewPoolSize),
      "User is not hard liquidatable."
    );
    

    vBaycNewPoolSize = _vBaycNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    if (virtualBalances[_user].uservBaycBalance > 0) {
      // _closeLongPosition(_user, uint256(uservBaycBalance[_user]));
      uint256 _assetSize = uint256(virtualBalances[_user].uservBaycBalance);
      uint256 usdBaycValue = getShortVusdAmountOut(_assetSize);
      //increase or decrease the user pnl for this function
      if (usdBaycValue > positive(virtualBalances[_user].uservUsdBalance)) {
        uint256 pnl = usdBaycValue - positive(virtualBalances[_user].uservUsdBalance);
        collateral[usdc][_user] += pnl;
      } else if (usdBaycValue < positive(virtualBalances[_user].uservUsdBalance)) {
        uint256 pnl = positive(virtualBalances[_user].uservUsdBalance) - usdBaycValue;
        collateral[usdc][_user] -= pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
      if (realizeVirtualCollAmount != 0) {
        _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      virtualBalances[_user].uservBaycBalance = 0;
      virtualBalances[_user].uservUsdBalance = 0;
      // if user has not vbalance so he is not active
      _removeActiveUser(_user);
      //update the pool
      uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
      pool.vBaycPoolSize += _assetSize;
      pool.vUsdPoolSize = k / pool.vBaycPoolSize;
      //update the new pool size
      k = vBaycNewPoolSize*vUsdNewPoolSize;
      vBaycNewPoolSize += _assetSize;
      vUsdNewPoolSize = k / vBaycNewPoolSize;
      //set events
      emit HardLiquidate(_user, marketPrice(), block.timestamp, _assetSize, usdBaycValue);
      emit Price(marketPrice(), _assetSize, block.timestamp, pool.vBaycPoolSize, pool.vUsdPoolSize);
    } else if (virtualBalances[_user].uservBaycBalance < 0) {
      uint256 _assetSize = positive(virtualBalances[_user].uservBaycBalance);
      uint256 usdBaycValue = getLongVusdAmountOut(_assetSize);
      //increase or decrease the user pnl for this function
      if (usdBaycValue > uint256(virtualBalances[_user].uservUsdBalance)) {
        uint256 pnl = usdBaycValue - positive(virtualBalances[_user].uservUsdBalance);
        collateral[usdc][_user] -= pnl;
      } else if (usdBaycValue < uint256(virtualBalances[_user].uservUsdBalance)) {
        uint256 pnl = positive(virtualBalances[_user].uservUsdBalance) - usdBaycValue;
        collateral[usdc][_user] += pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
      if (realizeVirtualCollAmount != 0) {
        _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      virtualBalances[_user].uservBaycBalance = 0;
      virtualBalances[_user].uservUsdBalance = 0;
      // if user has not vbalance so he is not active
      _removeActiveUser(_user);
      //update the pool
      uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
      pool.vBaycPoolSize -= _assetSize;
      pool.vUsdPoolSize = k / pool.vBaycPoolSize;
      //update the new pool size
      k = vBaycNewPoolSize*vUsdNewPoolSize;
      vBaycNewPoolSize -= _assetSize;
      vUsdNewPoolSize = k / vBaycNewPoolSize;
      //set events
      emit HardLiquidate(_user, marketPrice(), block.timestamp, _assetSize, usdBaycValue);
      emit Price(marketPrice(), _assetSize, block.timestamp, pool.vBaycPoolSize, pool.vUsdPoolSize);

    }
    uint256 collateralValue = collateral[usdc][_user];
    uint256 discountAmount = (discountRate * collateralValue) / 100;
    collateral[usdc][_user] -= discountAmount;
    insuranceFunds += discountAmount;
  }

  //this function is called if user should be liquidated by new price
  function _hardNegativeLiquidate(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal returns (uint256 vBaycNewPoolSize, uint256 vUsdNewPoolSize) {
    require(
      _isHardLiquidatable(_user, _vBaycNewPoolSize, _vUsdNewPoolSize),
      "User is not hard liquidatable."
    );
    vBaycNewPoolSize = _vBaycNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    if (virtualBalances[_user].uservBaycBalance > 0) {
      uint256 _assetSize = uint256(virtualBalances[_user].uservBaycBalance);
      int256 negativeValue = _getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);

      collateral[usdc][_user] = 0;
      virtualBalances[_user].virtualCollateral = 0;
      //update user balance
      virtualBalances[_user].uservBaycBalance = 0;
      virtualBalances[_user].uservUsdBalance = 0;
      // if user has not vbalance so he is not active
      _removeActiveUser(_user);
      //update the pool
      uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
      pool.vBaycPoolSize += _assetSize;
      pool.vUsdPoolSize = k / pool.vBaycPoolSize;
      //update the new pool size
      vBaycNewPoolSize += _assetSize;
      vUsdNewPoolSize = k / vBaycNewPoolSize;
      //set events
      emit HardLiquidate(_user, marketPrice(), block.timestamp, _assetSize, positive(negativeValue));
      emit Price(marketPrice(), _assetSize, block.timestamp, pool.vBaycPoolSize, pool.vUsdPoolSize);
      // reduce short users virtual collateral
      int256 allShortBaycBalance = getAllShortvBaycBalance();
      for (uint256 i = 0; i < activeUsers.length; i++) {
        address user = activeUsers[i];
        if (virtualBalances[_user].uservBaycBalance < 0) {
          uint256 liquidationCover = (uint256(negativeValue) *
            positive(virtualBalances[_user].uservBaycBalance)) / positive(allShortBaycBalance);
          virtualBalances[_user].virtualCollateral -= int256(liquidationCover);
        }
      }
    } else if (virtualBalances[_user].uservBaycBalance < 0) {
      uint256 _assetSize = uint256(positive(virtualBalances[_user].uservBaycBalance));
      int256 negativeValue = _getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);

      collateral[usdc][_user] = 0;
      virtualBalances[_user].virtualCollateral = 0;

      //update user balance
      virtualBalances[_user].uservBaycBalance = 0;
      virtualBalances[_user].uservUsdBalance = 0;
      // if user has not vbalance so he is not active
      _removeActiveUser(_user);
      //update the pool
      uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
      pool.vBaycPoolSize -= _assetSize;
      pool.vUsdPoolSize = k / pool.vBaycPoolSize;
      //update the new pool size
      vBaycNewPoolSize -= _assetSize;
      vUsdNewPoolSize = k / vBaycNewPoolSize;
      //set events
      emit HardLiquidate(_user, marketPrice(), block.timestamp, _assetSize, positive(negativeValue));
      emit Price(marketPrice(), _assetSize, block.timestamp, pool.vBaycPoolSize, pool.vUsdPoolSize); 
      // reduce long users virtual collateral
      int256 allLongvBaycBalance = getAllLongvBaycBalance();
      for (uint256 i = 0; i < activeUsers.length; i++) {
        address user = activeUsers[i];
        if (virtualBalances[_user].uservBaycBalance > 0) {
          uint256 liquidationCover = (uint256(negativeValue) *
            uint256(virtualBalances[_user].uservBaycBalance)) / uint256(allLongvBaycBalance);
          virtualBalances[_user].virtualCollateral -= int256(liquidationCover);
        }
      }
    }
  }

  //calculate liquidation amount to turn back the user margin to the save level(60%)
  function calculatePartialLiquidateValue(address _user) public view returns (uint256 x) {
    int256 totalAccountValue = getAccountValue(_user);
    uint256 totalPositionNotional = getPositionNotional(_user);
    uint256 numerator = (totalPositionNotional * saveLevelMargin) /
      100 -
      positive(totalAccountValue);
    uint256 denominator = saveLevelMargin - discountRate;
    x = (numerator * 100) / denominator;
  }

  //calculate liquidation amount to turn back the user margin to the save level(60%) according to the new price
  function _calculatePartialLiquidateValue(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (uint256) {
    int256 totalAccountValue = _getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    uint256 totalPositionNotional = _getNewPositionNotional(
      _user,
      _vBaycNewPoolSize,
      _vUsdNewPoolSize
    );
    uint256 numerator = (totalPositionNotional * saveLevelMargin) /
      100 -
      positive(totalAccountValue);
    uint256 denominator = saveLevelMargin - discountRate;
    uint256 x = (numerator * 100) / denominator;
    return x;
  }

  

  //Liquidate user partialy according to the new price
  function _partialLiquidate(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal returns (uint256 vBaycNewPoolSize, uint256 vUsdNewPoolSize) {
    require(
      _isPartialLiquidatable(_user, _vBaycNewPoolSize, _vUsdNewPoolSize),
      "user can not be partially liquidated"
    );
    
    vBaycNewPoolSize = _vBaycNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;

    uint256 liquidateAmount = _calculatePartialLiquidateValue(
      _user,
      _vBaycNewPoolSize,
      _vUsdNewPoolSize
    );
    //uint baycLiquidateAmount = liquidateAmount*pool.vBaycPoolSize/pool.vUsdPoolSize;
    // return BaycLiquidateAmount;
    if (virtualBalances[_user].uservBaycBalance > 0) {
      // _closeLongPosition(_user, baycLiquidateAmount);

      //get the output usd of closing position
      // uint256 usdBaycValue = getShortVusdAmountOut(baycLiquidateAmount);
      uint256 usdBaycValue = liquidateAmount;
      uint256 baycLiquidateAmount = getShortBaycAmountOut(usdBaycValue);
      int256 userPartialvUsdBalance = (virtualBalances[_user].uservUsdBalance *
        int256(baycLiquidateAmount)) / virtualBalances[_user].uservBaycBalance;

      //increase or decrease the user pnl for this function
      if (usdBaycValue > (positive(userPartialvUsdBalance))) {
        uint256 pnl = usdBaycValue - (positive(userPartialvUsdBalance));
        collateral[usdc][_user] += pnl;
      } else if (usdBaycValue < (positive(userPartialvUsdBalance))) {
        uint256 pnl = (positive(userPartialvUsdBalance) - usdBaycValue);
        collateral[usdc][_user] -= pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
      if (realizeVirtualCollAmount != 0) {
        _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      virtualBalances[_user].uservBaycBalance -= int256(baycLiquidateAmount);
      virtualBalances[_user].uservUsdBalance += absoluteInt(userPartialvUsdBalance);
      // if user has not vbalance so he is not active
      if (
        virtualBalances[_user].uservBaycBalance == 0 && virtualBalances[_user].uservUsdBalance == 0
      ) {
        _removeActiveUser(_user);
      }
      //update the pool
      uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
      pool.vBaycPoolSize += baycLiquidateAmount;
      pool.vUsdPoolSize = k / pool.vBaycPoolSize;
      //update the newPoolSize
      vBaycNewPoolSize += baycLiquidateAmount;
      vUsdNewPoolSize = k / vBaycNewPoolSize;
      //set events
      emit PartialLiquidate(msg.sender, marketPrice(), block.timestamp, baycLiquidateAmount, positive(userPartialvUsdBalance));
      emit Price(marketPrice(), baycLiquidateAmount, block.timestamp, pool.vBaycPoolSize, pool.vUsdPoolSize);
    } else if (virtualBalances[_user].uservBaycBalance < 0) {
      //get the output usd of closing position
      uint256 usdBaycValue = liquidateAmount;
      uint256 baycLiquidateAmount = getLongBaycAmountOut(usdBaycValue);
      int256 userPartialvUsdBalance = (virtualBalances[_user].uservUsdBalance *
        int256(baycLiquidateAmount)) / virtualBalances[_user].uservBaycBalance;
      //increase or decrease pnl of the user
      if (usdBaycValue > uint256(positive(userPartialvUsdBalance))) {
        uint256 pnl = usdBaycValue - uint256(positive(userPartialvUsdBalance));
        collateral[usdc][_user] -= pnl;
      }
      if (usdBaycValue < (positive(userPartialvUsdBalance))) {
        uint256 pnl = (positive(userPartialvUsdBalance) - usdBaycValue);
        collateral[usdc][_user] += pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
      if (realizeVirtualCollAmount != 0) {
        _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      }
      //update user balance
      virtualBalances[_user].uservBaycBalance += int256(baycLiquidateAmount);
      virtualBalances[_user].uservUsdBalance -= absoluteInt(userPartialvUsdBalance);
      // if user has not vbalance so he is not active
      if (
        virtualBalances[_user].uservBaycBalance == 0 && virtualBalances[_user].uservUsdBalance == 0
      ) {
        _removeActiveUser(_user);
      }
      //update pool
      uint256 k2 = pool.vBaycPoolSize * pool.vUsdPoolSize;
      pool.vBaycPoolSize -= baycLiquidateAmount;
      pool.vUsdPoolSize = k2 / pool.vBaycPoolSize;
      //update the newPoolSize
      vBaycNewPoolSize -= baycLiquidateAmount;
      vUsdNewPoolSize = k2 / vBaycNewPoolSize;
      //set events
      emit PartialLiquidate(msg.sender, marketPrice(), block.timestamp, baycLiquidateAmount, positive(userPartialvUsdBalance));
      emit Price(marketPrice(), baycLiquidateAmount, block.timestamp, pool.vBaycPoolSize, pool.vUsdPoolSize);
    }
    uint256 discountAmount = (liquidateAmount * discountRate) / 100;
    collateral[usdc][_user] -= discountAmount;
    insuranceFunds += discountAmount;
  }

  //liquidate users according to the new price (is used only in trade trade functions)
  function _hardLiquidateUsers(uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize)
    internal
    returns (uint256 vBaycNewPoolSize, uint256 vUsdNewPoolSize)
  {
    vBaycNewPoolSize = _vBaycNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isLiquidatable = _isHardLiquidatable(
          activeUsers[i],
          vBaycNewPoolSize,
          vUsdNewPoolSize
        );
        if (isLiquidatable == true) {
          int256 userMargin = _userNewMargin(activeUsers[i], vBaycNewPoolSize, vUsdNewPoolSize);
          if (userMargin > 0) {
            (vBaycNewPoolSize, vUsdNewPoolSize) = _hardLiquidate(
              activeUsers[i],
              vBaycNewPoolSize,
              vUsdNewPoolSize
            );
          } else if (userMargin < 0) {
            (vBaycNewPoolSize, vUsdNewPoolSize) = _hardNegativeLiquidate(
              activeUsers[i],
              vBaycNewPoolSize,
              vUsdNewPoolSize
            );
          }
        }
      }
    }
  }

  //liquidate users partialy according to the new price (is used only in trade trade functions)
  function _partialLiquidateUsers(uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize)
    internal
    returns (uint256 vBaycNewPoolSize, uint256 vUsdNewPoolSize)
  {
    vBaycNewPoolSize = _vBaycNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isPartialLiquidatable = _isPartialLiquidatable(
          activeUsers[i],
          vBaycNewPoolSize,
          vUsdNewPoolSize
        );
        if (isPartialLiquidatable == true) {
          (vBaycNewPoolSize, vUsdNewPoolSize) = _partialLiquidate(
            activeUsers[i],
            vBaycNewPoolSize,
            vUsdNewPoolSize
          );
        }
      }
    }
  }

  function getAllLongvBaycBalance() public view returns (int256) {
    int256 allLongBaycBalance;
    for (uint256 i; i < activeUsers.length; i++) {
      address user = activeUsers[i];
      int256 vBaycBalance = virtualBalances[user].uservBaycBalance;
      if (vBaycBalance > 0) {
        allLongBaycBalance += vBaycBalance;
      }
    }
    return allLongBaycBalance;
  }

  function getAllShortvBaycBalance() public view returns (int256) {
    int256 allShortBaycBalance;
    for (uint256 i; i < activeUsers.length; i++) {
      address user = activeUsers[i];
      int256 vBaycBalance = virtualBalances[user].uservBaycBalance;
      if (vBaycBalance < 0) {
        allShortBaycBalance += vBaycBalance;
      }
    }
    return allShortBaycBalance;
  }

  function setFundingRate() external onlyOwner {
    
    int fundingFraction = exchangeInfo.lastFundingRateAmount();
    uint fundingFractionTime = exchangeInfo.lastFundingRateTime();
    //first the contract check actual vBayc positions balance of users
    int256 allLongvBaycBalance = getAllLongvBaycBalance();
    int256 allShortBaycBalance = getAllShortvBaycBalance();

    //check if we dont have one side(long or short balance = 0) this funding action will not run
    if (allLongvBaycBalance > 0 && allShortBaycBalance < 0) {
      if (fundingFraction > 0) {
        int256 minOpenInterest = (
          absoluteInt(allLongvBaycBalance) > absoluteInt(allShortBaycBalance)
            ? absoluteInt(allShortBaycBalance)
            : absoluteInt(allLongvBaycBalance)
        );
        // uint256 difference = currentPrice - oraclePrice;
        uint256 fundingFee = (uint256(minOpenInterest) * uint(fundingFraction))/1e18 / 24e18;
        for (uint256 i = 0; i < activeUsers.length; i++) {
          address user = activeUsers[i];
          if (virtualBalances[user].uservBaycBalance > 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee *
              uint256(virtualBalances[user].uservBaycBalance)) / uint256(allLongvBaycBalance);
            virtualBalances[user].virtualCollateral -= int256(userFundingFee);
          } else if (virtualBalances[user].uservBaycBalance < 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee *
              positive(virtualBalances[user].uservBaycBalance)) / positive(allShortBaycBalance);
            virtualBalances[user].virtualCollateral += int256(userFundingFee);
          }
        }
      } else if (fundingFraction < 0) {
        int256 minOpenInterest = (
          absoluteInt(allLongvBaycBalance) > absoluteInt(allShortBaycBalance)
            ? absoluteInt(allShortBaycBalance)
            : absoluteInt(allLongvBaycBalance)
        );
        // uint256 difference = oraclePrice - currentPrice;
        uint256 fundingFee = (uint256(minOpenInterest) * positive(fundingFraction))/1e18 / 24e18;
        for (uint256 i = 0; i < activeUsers.length; i++) {
          address user = activeUsers[i];
          if (virtualBalances[user].uservBaycBalance > 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee *
              uint256(virtualBalances[user].uservBaycBalance)) / uint256(allLongvBaycBalance);
            virtualBalances[user].virtualCollateral += int256(userFundingFee);
          } else if (virtualBalances[user].uservBaycBalance < 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee *
              positive(virtualBalances[user].uservBaycBalance)) / positive(allShortBaycBalance);
            virtualBalances[user].virtualCollateral -= int256(userFundingFee);
          }
        }
      }
      lastSetFundingRateTime = block.timestamp;
    }
  }

  //return positive int
  function absoluteInt(int256 _value) public pure returns (int256) {
    if (_value < 0) {
      return -(_value);
    } else {
      return _value;
    }
  }
  
  //return false if new price go further than the oracle price
  function isPriceIntheRightRange(uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize)
    public
    view
    returns (bool)
  {
    uint256 currentPrice = (1e18 * pool.vUsdPoolSize) / pool.vBaycPoolSize;
    uint256 oraclePrice = exchangeInfo.oraclePrice();
    uint256 newPrice = (1e18 * _vUsdNewPoolSize) / _vBaycNewPoolSize;

    int256 currentDifference = int256(oraclePrice) - int256(currentPrice);
    int256 currentDifferencePercentage = (100 * currentDifference) / int256(currentPrice);
    int256 currentDifferenceDistance = absoluteInt(currentDifferencePercentage) - 10;

    int256 newDifference = int256(oraclePrice) - int256(newPrice);
    int256 newDifferencePercentage = (100 * newDifference) / int256(newPrice);
    int256 newDifferenceDistance = absoluteInt(newDifferencePercentage) - 10;

    if (currentDifferenceDistance > 0) {
      //we are outside the target range and need to be brought back
      if (newDifferenceDistance < currentDifferenceDistance) {
        return true; //trade allowed, we move closer
      } else {
        return false; //trade is not allowed, we move more distant
      }
    } else {
      //we are inside the target range
      if (newDifferenceDistance < 10) {
        return true; //trade allowed we stay within target range.
      } else {
        return false;
      }
    }
  }

  // remove insurance funds from contract to owner account
  function removeInsuranceFunds(uint256 _amount) public onlyOwner {
    require(
      _amount <= insuranceFunds,
      "Requested collect amount is larger than the ContractFee balance."
    );
    SafeERC20.safeTransfer(IERC20(usdc), msg.sender, _amount);
    insuranceFunds -= _amount;
  }

  
  function isLongInRightRange(uint256 _usdAmount) external view returns (bool) {
    uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize + _usdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    bool isInTheRightRange = isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    return isInTheRightRange;
  }

  function isShortInRightRange(uint256 _usdAmount) external view returns (bool) {
    uint256 k = pool.vBaycPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize - _usdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    bool isInTheRightRange = isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    return isInTheRightRange;
  }
  
  function marketPrice() public view returns (uint256) {
    return (1e18 * pool.vUsdPoolSize) / pool.vBaycPoolSize;
  }
}