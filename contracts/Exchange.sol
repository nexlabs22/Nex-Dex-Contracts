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
  
  string public assetName;
  ExchangeInfo public exchangeInfo;

  address public usdc;

  bool public poolInitialized; // is pool initialized

  uint256 public liquidationFee;

  uint8 public discountRate = 20; //20%
  uint8 public saveLevelMargin = 60; //60%
  uint8 public maintenanceMargin = 50; //50%
  uint8 public AutoCloseMargin = 40; //40%

  uint8 public swapFee = 10; //=> 10/10000 = 0.1%
  uint256 public latestFeeUpdate;

  uint public lastSetFundingRateTime;
  bool public tradingLimit;

  int public allLongvAssetBalances;
  int public allShortvAssetBalances;

  int public allLongvUsdBalances;
  int public allShortvUsdBalances;

  struct Pool {
    uint256 vAssetPoolSize;
    uint256 vUsdPoolSize;
  }

  Pool public pool;

  struct VirtualBalance {
    int256 virtualCollateral; //funding reward of each user
    int256 uservUsdBalance; // virtual usd balance of each user;
    int256 uservAssetBalance; // virtual nft balance of each user;
  }

  address[] public activeUsers;

  mapping(address => mapping(address => uint256)) public collateral; //collateral[tokenaddress][useraddress]
  mapping(address => VirtualBalance) public virtualBalances;
  mapping(address => bool) public isUserActive;

  
  event NewOracle(address oracle);
  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);

  event OpenLongPosition(address user, uint256 price, uint256 timestamp, uint256 vAssetAmount, uint256 vUsdAmount);
  event OpenShortPosition(address user, uint256 price, uint256 timestamp, uint256 vAssetAmount, uint256 vUsdAmount);
  event CloseLongPosition(address user, uint256 price, uint256 timestamp, uint256 vAssetAmount, uint256 vUsdAmount);
  event CloseShortPosition(address user, uint256 price, uint256 timestamp, uint256 vAssetAmount, uint256 vUsdAmount);

  event HardLiquidate(address user, uint price, uint timestamp, uint vAssetAmount, uint vUsdAmount);
  event PartialLiquidate(address user, uint price, uint timestamp, uint vAssetAmount, uint vUsdAmount);

  event Price(uint price, uint volume, uint timestamp, uint vAssetPoolSize, uint vUsdPoolSize);

  constructor(
    address _usdc,
    address _exchangeInfo,
    string memory _assetName
  ) {
    usdc = _usdc;
    exchangeInfo = ExchangeInfo(_exchangeInfo);
    assetName = _assetName;
  }

  //return Asset virtual pool size of the market
  function vAssetPoolSize() public view returns (uint256) {
    return pool.vAssetPoolSize;
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

  //return virtual Asset balance of each user
  function uservAssetBalance(address _user) public view returns (int256) {
    return virtualBalances[_user].uservAssetBalance;
  }

  function setAssetName(string memory _assetName) public onlyOwner {
    assetName = _assetName;
  }

  function setExchangeInfo(address _exchangeInfo) public onlyOwner {
    require(_exchangeInfo != address(0), "New exchange info address can not be a zero address");
    exchangeInfo = ExchangeInfo(_exchangeInfo);
  }

  function lastFundingRateAmount() public view returns (int256) {
    return exchangeInfo.assetFundingfractionaverage(assetName);
  }

  function lastFundingRateTime() public view returns (uint256) {
    return exchangeInfo.lastUpdateTime();
  }

  function oraclePrice() public view returns (uint256) {
    return exchangeInfo.assetPrice(assetName);
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

  function _updateAllvAssetBalances(int currentBalance, int changeAmount) internal {
    if(currentBalance > 0){
      if(currentBalance + changeAmount >= 0){
        allLongvAssetBalances += changeAmount;
      }else{
        allLongvAssetBalances -= currentBalance;
        allShortvAssetBalances += currentBalance + changeAmount;
      }
    }else if(currentBalance < 0){
      if(currentBalance + changeAmount <= 0){
        allShortvAssetBalances += changeAmount;
      }else{
        allShortvAssetBalances -= currentBalance;
        allLongvAssetBalances += currentBalance + changeAmount;
      }
    }else{
      if(changeAmount > 0){
        allLongvAssetBalances += changeAmount;
      }else{
        allShortvAssetBalances += changeAmount;
      }
    }
  }


  function _updateAllvUsdBalances(int currentBalance, int changeAmount) internal {
    if(currentBalance > 0){
      if(currentBalance + changeAmount >= 0){
        allShortvUsdBalances += changeAmount;
      }else{
        allShortvUsdBalances -= currentBalance;
        allLongvUsdBalances += currentBalance + changeAmount;
      }
    }else if(currentBalance < 0){
      if(currentBalance + changeAmount <= 0){
        allLongvUsdBalances += changeAmount;
      }else{
        allLongvUsdBalances -= currentBalance;
        allShortvUsdBalances += currentBalance + changeAmount;
      }
    }else{
      if(changeAmount > 0){
        allShortvUsdBalances += changeAmount;
      }else{
        allLongvUsdBalances += changeAmount;
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
    uint256 oraclePrice = exchangeInfo.assetPrice(assetName);
    pool.vAssetPoolSize = _assetSize;
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

  //get output Asset by usd input amount if we want to buy(long)
  //how much Asset we will get by paying usd for long
  function getLongAssetAmountOut(uint256 _vUsdAmount) public view returns (uint256) {
    uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize + _vUsdAmount;
    uint256 newvAssetPoolSize = k / newvUsdPoolSize;
    uint256 userAsset = pool.vAssetPoolSize - newvAssetPoolSize;
    return userAsset;
  }

  //get output usd amount by Asset input amount if we want to buy(long)
  function getLongVusdAmountOut(uint256 _vAssetAmount) public view returns (uint256) {
    uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    uint256 newvAssetPoolSize = pool.vAssetPoolSize - _vAssetAmount;
    uint256 newvUsdPoolSize = k / newvAssetPoolSize;
    uint256 uservUsd = newvUsdPoolSize - pool.vUsdPoolSize;
    return uservUsd;
  }

  //get output Asset by usd input amount if we want to sell(short)
  function getShortAssetAmountOut(uint256 _vUsdAmount) public view returns (uint256) {
    uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize - _vUsdAmount;
    uint256 newvAssetPoolSize = k / newvUsdPoolSize;
    uint256 userAsset = newvAssetPoolSize - pool.vAssetPoolSize;
    return userAsset;
  }

  //get output usd by Asset input amount if we want to sell(short)
  function getShortVusdAmountOut(uint256 _vAssetAmount) public view returns (uint256) {
    uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    uint256 newvAssetPoolSize = pool.vAssetPoolSize + _vAssetAmount;
    uint256 newvUsdPoolSize = k / newvAssetPoolSize;
    uint256 uservUsd = pool.vUsdPoolSize - newvUsdPoolSize;
    return uservUsd;
  }

  //I use int for negative/positve numbers for user Asset and usd balance(wich might be negative)
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
    return (1e18 * pool.vUsdPoolSize) / pool.vAssetPoolSize;
  }
  
  
  function openLongPosition(uint256 _usdAmount, uint256 _minimumAssetAmountOut) public {
    //calculate the new pool size and user Asset amount
    uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize + _usdAmount;
    uint256 newvAssetPoolSize = k / newvUsdPoolSize;
    if(tradingLimit){
    bool isInTheRightRange = isPriceIntheRightRange(newvAssetPoolSize, newvUsdPoolSize);
    require(
      isInTheRightRange == true,
      "You can't move the price more than 10% away from the oracle price."
    );
    }
    bool isNewMarginHardLiquidatable = _isNewMarginLiquidatable(
      msg.sender,
      newvAssetPoolSize,
      newvUsdPoolSize
    );
    require(
      isNewMarginHardLiquidatable == false,
      "Insufficient margin to open position with requested size."
    );

    //first we run liquidation functions
    (newvAssetPoolSize, newvUsdPoolSize) = _hardLiquidateUsers(newvAssetPoolSize, newvUsdPoolSize);
    (newvAssetPoolSize, newvUsdPoolSize) = _partialLiquidateUsers(newvAssetPoolSize, newvUsdPoolSize);
    

    k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    newvUsdPoolSize = pool.vUsdPoolSize + _usdAmount;
    newvAssetPoolSize = k / newvUsdPoolSize;
    uint256 userAsset = pool.vAssetPoolSize - newvAssetPoolSize;
    require(userAsset >= _minimumAssetAmountOut, "INSUFFICIENT_OUTPUT_AMOUNT");
    //update total balances
    _updateAllvAssetBalances(virtualBalances[msg.sender].uservAssetBalance, int(userAsset));
    _updateAllvUsdBalances(virtualBalances[msg.sender].uservUsdBalance, -int(_usdAmount));
    //update Asset and usd balance of user
    virtualBalances[msg.sender].uservAssetBalance += int(userAsset);
    virtualBalances[msg.sender].uservUsdBalance -= int(_usdAmount);

    //add user to the active user list
    _addActiveUser(msg.sender);

    //trade fee
    uint256 fee = (_usdAmount * swapFee) / 10000;
    collateral[usdc][msg.sender] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);

    //update pool
    pool.vAssetPoolSize = newvAssetPoolSize;
    pool.vUsdPoolSize = newvUsdPoolSize;

    //set the event
    emit OpenLongPosition(msg.sender, marketPrice(), block.timestamp, userAsset, _usdAmount);
    emit Price(marketPrice(), userAsset, block.timestamp, pool.vAssetPoolSize, pool.vUsdPoolSize);
  }
  

  function openShortPosition(uint256 _usdAmount, uint256 _minimumAssetAmountOut) public {
    //calculate the new pool size and user Asset amount
    uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize - _usdAmount;
    uint256 newvAssetPoolSize = k / newvUsdPoolSize;
    if(tradingLimit){
    bool isInTheRightRange = isPriceIntheRightRange(newvAssetPoolSize, newvUsdPoolSize);
    require(
      isInTheRightRange == true,
      "You can't move the price more than 10% away from the oracle price."
    );
    }
    bool isNewMarginHardLiquidatable = _isNewMarginLiquidatable(
      msg.sender,
      newvAssetPoolSize,
      newvUsdPoolSize
    );
    require(
      isNewMarginHardLiquidatable == false,
      "Insufficient margin to open position with requested size."
    );

    //first we run liquidation functions
    (newvAssetPoolSize, newvUsdPoolSize) = _hardLiquidateUsers(newvAssetPoolSize, newvUsdPoolSize);
    (newvAssetPoolSize, newvUsdPoolSize) = _partialLiquidateUsers(newvAssetPoolSize, newvUsdPoolSize);
    

    k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    newvUsdPoolSize = pool.vUsdPoolSize - _usdAmount;
    newvAssetPoolSize = k / newvUsdPoolSize;
    uint256 userAsset = newvAssetPoolSize - pool.vAssetPoolSize;
    require(userAsset >= _minimumAssetAmountOut, "INSUFFICIENT_OUTPUT_AMOUNT");
    //update total balances
    _updateAllvAssetBalances(virtualBalances[msg.sender].uservAssetBalance, -int256(userAsset));
    _updateAllvUsdBalances(virtualBalances[msg.sender].uservUsdBalance, int256(_usdAmount));
    //update Asset and usd balance of user
    virtualBalances[msg.sender].uservAssetBalance -= int256(userAsset);
    virtualBalances[msg.sender].uservUsdBalance += int256(_usdAmount);

    //add user to the active user list
    _addActiveUser(msg.sender);

    //trade fee
    uint256 fee = (_usdAmount * swapFee) / 10000;
    collateral[usdc][msg.sender] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);

    //update pool
    pool.vAssetPoolSize = newvAssetPoolSize;
    pool.vUsdPoolSize = newvUsdPoolSize;

    //set the event
    emit OpenShortPosition(msg.sender, marketPrice(), block.timestamp, userAsset, _usdAmount);
    emit Price(marketPrice(), userAsset, block.timestamp, pool.vAssetPoolSize, pool.vUsdPoolSize);
  }

  function _closeLongPosition(address _user, uint256 _assetSize, uint256 _minimumUsdOut) internal {
    require(
      _assetSize <= positive(virtualBalances[_user].uservAssetBalance),
      "Reduce only order can only close long size equal or less than the outstanding asset size."
    );

    uint256 k;
    //first we run liquidation functions
    k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    uint256 vAssetNewPoolSize = pool.vAssetPoolSize + _assetSize;
    uint256 vUsdNewPoolSize = k / vAssetNewPoolSize;

    //liquidate users
    (vAssetNewPoolSize, vUsdNewPoolSize) = _hardLiquidateUsers(vAssetNewPoolSize, vUsdNewPoolSize);
    (vAssetNewPoolSize, vUsdNewPoolSize) = _partialLiquidateUsers(vAssetNewPoolSize, vUsdNewPoolSize);

    //get the output usd of closing position
    //f.e 1Asset -> 2000$
    uint256 usdAssetValue = getShortVusdAmountOut(_assetSize);
    require(usdAssetValue >= _minimumUsdOut, "INSUFFICIENT_OUTPUT_AMOUNT");
    int256 userPartialvUsdBalance = (virtualBalances[_user].uservUsdBalance * int256(_assetSize)) /
      virtualBalances[_user].uservAssetBalance;

    //increase or decrease the user pnl for this function
    if (usdAssetValue > uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = usdAssetValue - uint256(positive(userPartialvUsdBalance));
      // collateral[usdc][_user] += pnl;
      collateral[usdc][_user] += pnl;
    } else if (usdAssetValue < uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = uint256(positive(userPartialvUsdBalance) - usdAssetValue);
      collateral[usdc][_user] -= pnl;
    }
    //realize funding reward of user;
    int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
    if (realizeVirtualCollAmount != 0) {
      _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
    }
    //update total balances
    _updateAllvAssetBalances(virtualBalances[_user].uservAssetBalance, -int256(_assetSize));
    _updateAllvUsdBalances(virtualBalances[_user].uservUsdBalance, absoluteInt(userPartialvUsdBalance));
    //update user balance
    virtualBalances[_user].uservAssetBalance -= int256(_assetSize);
    virtualBalances[_user].uservUsdBalance += absoluteInt(userPartialvUsdBalance);
    // if user has not vbalance so he is not active
    if (
      virtualBalances[_user].uservAssetBalance == 0 && virtualBalances[_user].uservUsdBalance == 0
    ) {
      _removeActiveUser(_user);
    }

    //trade fee
    uint256 fee = (usdAssetValue * swapFee) / 10000;
    collateral[usdc][_user] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);

    //update the pool
    k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    pool.vAssetPoolSize += _assetSize;
    pool.vUsdPoolSize = k / pool.vAssetPoolSize;

    //set event
    emit CloseLongPosition(msg.sender, marketPrice(), block.timestamp, _assetSize, positive(userPartialvUsdBalance));
    emit Price(marketPrice(), _assetSize, block.timestamp, pool.vAssetPoolSize, pool.vUsdPoolSize);
  }

  function _closeShortPosition(address _user, uint256 _assetSize, uint256 _minimumUsdOut) internal {
    require(
      _assetSize <= positive(virtualBalances[_user].uservAssetBalance),
      "Reduce only order can only close short size equal or less than the outstanding asset size."
    );

    uint256 k;
    //first we run liquidation functions
    k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    uint256 vAssetNewPoolSize = pool.vAssetPoolSize - _assetSize;
    uint256 vUsdNewPoolSize = k / vAssetNewPoolSize;


    //liquidate users
    (vAssetNewPoolSize, vUsdNewPoolSize) = _hardLiquidateUsers(vAssetNewPoolSize, vUsdNewPoolSize);
    (vAssetNewPoolSize, vUsdNewPoolSize) = _partialLiquidateUsers(vAssetNewPoolSize, vUsdNewPoolSize);
    
    //get the output usd of closing position
    uint256 usdAssetValue = getLongVusdAmountOut(_assetSize);
    require(usdAssetValue >= _minimumUsdOut, "INSUFFICIENT_OUTPUT_AMOUNT");

    int256 userPartialvUsdBalance = (virtualBalances[_user].uservUsdBalance * int256(_assetSize)) /
      virtualBalances[_user].uservAssetBalance;
    //increase or decrease pnl of the user
    if (usdAssetValue > uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = usdAssetValue - uint256(positive(userPartialvUsdBalance));
      collateral[usdc][_user] -= pnl;
    }
    if (usdAssetValue < uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = uint256(positive(userPartialvUsdBalance) - usdAssetValue);
      collateral[usdc][_user] += pnl;
    }
    //realize funding reward of user;
    int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
    if (realizeVirtualCollAmount != 0) {
      _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
    }
    //update total balances
    _updateAllvAssetBalances(virtualBalances[_user].uservAssetBalance, int256(_assetSize));
    _updateAllvUsdBalances(virtualBalances[_user].uservUsdBalance, -absoluteInt(userPartialvUsdBalance));
    //update user balance
    virtualBalances[_user].uservAssetBalance += int256(_assetSize);
    virtualBalances[_user].uservUsdBalance -= absoluteInt(userPartialvUsdBalance);
    // if user has not vbalance so he is not active
    if (
      virtualBalances[_user].uservAssetBalance == 0 && virtualBalances[_user].uservUsdBalance == 0
    ) {
      _removeActiveUser(_user);
    }
    //trade fee
    uint256 fee = (usdAssetValue * swapFee) / 10000;
    collateral[usdc][_user] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);
    //update pool
    k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    pool.vAssetPoolSize -= _assetSize;
    pool.vUsdPoolSize = k / pool.vAssetPoolSize;

    //set event
    emit CloseShortPosition(msg.sender, marketPrice(), block.timestamp, _assetSize, positive(userPartialvUsdBalance));
    emit Price(marketPrice(), _assetSize, block.timestamp, pool.vAssetPoolSize, pool.vUsdPoolSize);
  }

  function closePositionComplete(uint256 _minimumUsdOut) public {
    uint256 assetSize = positive(virtualBalances[msg.sender].uservAssetBalance);
    closePosition(assetSize, _minimumUsdOut);
  }

  function closePosition(uint256 _assetSize, uint256 _minimumUsdOut) public {
    require(
      _assetSize <= positive(virtualBalances[msg.sender].uservAssetBalance),
      "Reduce only order can only close size equal or less than the outstanding asset size."
    );
    //if user has positive vAsset balance so he/she has longPosition
    //if user has negative vAsset balance so he/she has shortPosition
    if (virtualBalances[msg.sender].uservAssetBalance > 0) {
      _closeLongPosition(msg.sender, _assetSize, _minimumUsdOut);
    } else if (virtualBalances[msg.sender].uservAssetBalance < 0) {
      _closeShortPosition(msg.sender, _assetSize, _minimumUsdOut);
    }
  }

  //return the pnl of user
  function getPNL(address _user) public view returns (int256 pnl) {
    if (virtualBalances[_user].uservAssetBalance > 0) {
      uint256 currentAssetValue = getShortVusdAmountOut(
        uint256(virtualBalances[_user].uservAssetBalance)
      );
      pnl = int256(currentAssetValue) + (virtualBalances[_user].uservUsdBalance);
    } else if (virtualBalances[_user].uservAssetBalance < 0) {
      uint256 currentAssetValue = getLongVusdAmountOut(
        positive(virtualBalances[_user].uservAssetBalance)
      );
      pnl = virtualBalances[_user].uservUsdBalance - int256(currentAssetValue);
    } else {
      pnl = 0;
    }
  }

  //get user pnl by new pool size(new price);
  function _getNewPNL(
    address _user,
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (int256) {
    if (virtualBalances[_user].uservAssetBalance > 0) {
      uint256 k = _vAssetNewPoolSize * _vUsdNewPoolSize;
      uint256 newvAssetPoolSize = _vAssetNewPoolSize +
        uint256(virtualBalances[_user].uservAssetBalance);
      uint256 newvUsdPoolSize = k / newvAssetPoolSize;
      uint256 currentAssetValue = _vUsdNewPoolSize - newvUsdPoolSize;
      int256 pnl = int256(currentAssetValue) + (virtualBalances[_user].uservUsdBalance);
      return pnl;
    } else if (virtualBalances[_user].uservAssetBalance < 0) {
      uint256 k = _vAssetNewPoolSize * _vUsdNewPoolSize;
      uint256 newvAssetPoolSize = _vAssetNewPoolSize -
        positive(virtualBalances[_user].uservAssetBalance);
      uint256 newvUsdPoolSize = k / newvAssetPoolSize;
      uint256 currentAssetValue = newvUsdPoolSize - _vUsdNewPoolSize;
      int256 pnl = virtualBalances[_user].uservUsdBalance - int256(currentAssetValue);
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
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (int256) {
    uint256 collateralValue = collateral[usdc][_user];
    int256 pnl = _getNewPNL(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    int256 fundingReward = virtualBalances[_user].virtualCollateral;
    int256 accountValue = int256(collateralValue) + pnl + fundingReward;
    // int256 accountValue = int256(collateralValue);
    return accountValue;
  }

  //get total position value of each user
  function getPositionNotional(address _user) public view returns (uint256) {
    if (virtualBalances[_user].uservAssetBalance > 0) {
      uint256 positionNotionalValue = getShortVusdAmountOut(
        uint256(virtualBalances[_user].uservAssetBalance)
      );
      return positionNotionalValue;
    } else if (virtualBalances[_user].uservAssetBalance < 0) {
      uint256 positionNotionalValue = getLongVusdAmountOut(
        uint256(absoluteInt((virtualBalances[_user].uservAssetBalance)))
      );
      return positionNotionalValue;
    } else {
      return 0;
    }
  }

  //get new position notional value according to the new pool size (new price)
  function _getNewPositionNotional(
    address _user,
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (uint256) {
    if (virtualBalances[_user].uservAssetBalance > 0) {
      uint256 k = _vAssetNewPoolSize * _vUsdNewPoolSize;
      uint256 newvAssetPoolSize = _vAssetNewPoolSize +
        uint256(virtualBalances[_user].uservAssetBalance);
      uint256 newvUsdPoolSize = k / newvAssetPoolSize;
      uint256 positionNotionalValue = _vUsdNewPoolSize - newvUsdPoolSize;
      return positionNotionalValue;
    } else if (virtualBalances[_user].uservAssetBalance < 0) {
      uint256 k = _vAssetNewPoolSize * _vUsdNewPoolSize;
      uint256 newvAssetPoolSize = _vAssetNewPoolSize -
        positive(virtualBalances[_user].uservAssetBalance);
      uint256 newvUsdPoolSize = k / newvAssetPoolSize;
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
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (int256) {
    int256 accountValue = _getNewAccountValue(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    uint256 positionNotional = _getNewPositionNotional(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
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
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (bool) {
    int256 userMargin = _userNewMargin(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    if (userMargin != 0 && userMargin <= int8(AutoCloseMargin) && msg.sender != _user) {
      return true;
    } else {
      return false;
    }
  }

  function _isNewMarginLiquidatable(
    address _user,
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (bool) {
    int256 newMargin = _newMargin(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    if (newMargin != 0 && newMargin <= int8(saveLevelMargin)) {
      return true;
    } else {
      return false;
    }
  }


  function _newMargin(
    address _user,
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (int) {
    //calculate new position notional
    int userNewAssetBalance = virtualBalances[_user].uservAssetBalance + int(pool.vAssetPoolSize) - int(_vAssetNewPoolSize);
    int userNewUsdBalance = virtualBalances[_user].uservUsdBalance + int(pool.vUsdPoolSize) - int(_vUsdNewPoolSize);
    uint256 newPositionNotional;
    int pnl;
    if(userNewAssetBalance>0){
      uint256 k = _vAssetNewPoolSize * _vUsdNewPoolSize;
      uint256 newvAssetPoolSize = _vAssetNewPoolSize + uint(userNewAssetBalance);
      uint256 newvUsdPoolSize = k/newvAssetPoolSize;
      newPositionNotional = _vUsdNewPoolSize - newvUsdPoolSize;
      pnl = int(newPositionNotional) - absoluteInt(userNewUsdBalance);
    }else{
      uint256 k = _vAssetNewPoolSize * _vUsdNewPoolSize;
      uint256 newvAssetPoolSize = _vAssetNewPoolSize - positive(userNewAssetBalance);
      uint256 newvUsdPoolSize = k/newvAssetPoolSize;
      newPositionNotional = newvUsdPoolSize - _vUsdNewPoolSize;
      pnl = absoluteInt(userNewUsdBalance) - int(newPositionNotional);
    }
    //account value
    int256 accountValue = int256(collateral[usdc][_user]) + pnl + virtualBalances[_user].virtualCollateral;
    int256 newMargin;
    if(newPositionNotional>0){
      newMargin = (100*accountValue) / int256(newPositionNotional);
    }
    return int(newMargin);
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
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (bool) {
    int256 userMargin = _userNewMargin(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    // if ( 40 < userMargin < 50 ) => user is partial liquidatable
    if (int8(AutoCloseMargin) <= userMargin && userMargin <= int8(maintenanceMargin) && msg.sender != _user) {
      return true;
    } else {
      return false;
    }
  }

  //this function is called if user should be liquidated by new price
  function _hardLiquidate(
    address _user,
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal returns (uint256 vAssetNewPoolSize, uint256 vUsdNewPoolSize) {
    require(
      _isHardLiquidatable(_user, _vAssetNewPoolSize, _vUsdNewPoolSize),
      "User is not hard liquidatable."
    );
    

    vAssetNewPoolSize = _vAssetNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    if (virtualBalances[_user].uservAssetBalance > 0) {
      // _closeLongPosition(_user, uint256(uservAssetBalance[_user]));
      uint256 _assetSize = uint256(virtualBalances[_user].uservAssetBalance);
      uint256 usdAssetValue = getShortVusdAmountOut(_assetSize);
      //increase or decrease the user pnl for this function
      if (usdAssetValue > positive(virtualBalances[_user].uservUsdBalance)) {
        uint256 pnl = usdAssetValue - positive(virtualBalances[_user].uservUsdBalance);
        collateral[usdc][_user] += pnl;
      } else if (usdAssetValue < positive(virtualBalances[_user].uservUsdBalance)) {
        uint256 pnl = positive(virtualBalances[_user].uservUsdBalance) - usdAssetValue;
        collateral[usdc][_user] -= pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
      if (realizeVirtualCollAmount != 0) {
        _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      }
      //update total balances
      _updateAllvAssetBalances(virtualBalances[_user].uservAssetBalance, -virtualBalances[_user].uservAssetBalance);
      _updateAllvUsdBalances(virtualBalances[_user].uservUsdBalance, -virtualBalances[_user].uservUsdBalance);
      //update user balance
      virtualBalances[_user].uservAssetBalance = 0;
      virtualBalances[_user].uservUsdBalance = 0;
      // if user has not vbalance so he is not active
      _removeActiveUser(_user);
      //update the pool
      uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
      pool.vAssetPoolSize += _assetSize;
      pool.vUsdPoolSize = k / pool.vAssetPoolSize;
      //update the new pool size
      k = vAssetNewPoolSize*vUsdNewPoolSize;
      vAssetNewPoolSize += _assetSize;
      vUsdNewPoolSize = k / vAssetNewPoolSize;
      //set events
      emit HardLiquidate(_user, marketPrice(), block.timestamp, _assetSize, usdAssetValue);
      emit Price(marketPrice(), _assetSize, block.timestamp, pool.vAssetPoolSize, pool.vUsdPoolSize);
    } else if (virtualBalances[_user].uservAssetBalance < 0) {
      uint256 _assetSize = positive(virtualBalances[_user].uservAssetBalance);
      uint256 usdAssetValue = getLongVusdAmountOut(_assetSize);
      //increase or decrease the user pnl for this function
      if (usdAssetValue > uint256(virtualBalances[_user].uservUsdBalance)) {
        uint256 pnl = usdAssetValue - positive(virtualBalances[_user].uservUsdBalance);
        collateral[usdc][_user] -= pnl;
      } else if (usdAssetValue < uint256(virtualBalances[_user].uservUsdBalance)) {
        uint256 pnl = positive(virtualBalances[_user].uservUsdBalance) - usdAssetValue;
        collateral[usdc][_user] += pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
      if (realizeVirtualCollAmount != 0) {
        _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      }
      //update total balances
      _updateAllvAssetBalances(virtualBalances[_user].uservAssetBalance, -virtualBalances[_user].uservAssetBalance);
      _updateAllvUsdBalances(virtualBalances[_user].uservUsdBalance, -virtualBalances[_user].uservUsdBalance);
      //update user balance
      virtualBalances[_user].uservAssetBalance = 0;
      virtualBalances[_user].uservUsdBalance = 0;
      // if user has not vbalance so he is not active
      _removeActiveUser(_user);
      //update the pool
      uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
      pool.vAssetPoolSize -= _assetSize;
      pool.vUsdPoolSize = k / pool.vAssetPoolSize;
      //update the new pool size
      k = vAssetNewPoolSize*vUsdNewPoolSize;
      vAssetNewPoolSize -= _assetSize;
      vUsdNewPoolSize = k / vAssetNewPoolSize;
      //set events
      emit HardLiquidate(_user, marketPrice(), block.timestamp, _assetSize, usdAssetValue);
      emit Price(marketPrice(), _assetSize, block.timestamp, pool.vAssetPoolSize, pool.vUsdPoolSize);

    }
    uint256 collateralValue = collateral[usdc][_user];
    uint256 discountAmount = (discountRate * collateralValue) / 100;
    collateral[usdc][_user] -= discountAmount;
    liquidationFee += discountAmount;
  }

  //this function is called if user should be liquidated by new price
  function _hardNegativeLiquidate(
    address _user,
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal returns (uint256 vAssetNewPoolSize, uint256 vUsdNewPoolSize) {
    require(
      _isHardLiquidatable(_user, _vAssetNewPoolSize, _vUsdNewPoolSize),
      "User is not hard liquidatable."
    );
    vAssetNewPoolSize = _vAssetNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    if (virtualBalances[_user].uservAssetBalance > 0) {
      uint256 _assetSize = uint256(virtualBalances[_user].uservAssetBalance);
      int256 negativeValue = _getNewAccountValue(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);

      collateral[usdc][_user] = 0;
      virtualBalances[_user].virtualCollateral = 0;
      //update total balances
      _updateAllvAssetBalances(virtualBalances[_user].uservAssetBalance, -virtualBalances[_user].uservAssetBalance);
      _updateAllvUsdBalances(virtualBalances[_user].uservUsdBalance, -virtualBalances[_user].uservUsdBalance);
      //update user balance
      virtualBalances[_user].uservAssetBalance = 0;
      virtualBalances[_user].uservUsdBalance = 0;
      // if user has not vbalance so he is not active
      _removeActiveUser(_user);
      //update the pool
      uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
      pool.vAssetPoolSize += _assetSize;
      pool.vUsdPoolSize = k / pool.vAssetPoolSize;
      //update the new pool size
      vAssetNewPoolSize += _assetSize;
      vUsdNewPoolSize = k / vAssetNewPoolSize;
      //set events
      emit HardLiquidate(_user, marketPrice(), block.timestamp, _assetSize, positive(negativeValue));
      emit Price(marketPrice(), _assetSize, block.timestamp, pool.vAssetPoolSize, pool.vUsdPoolSize);
      // reduce short users virtual collateral
      (, int256 allShortAssetBalance,,) = getTotalBalances();
      for (uint256 i = 0; i < activeUsers.length; i++) {
        address user = activeUsers[i];
        if (virtualBalances[user].uservAssetBalance < 0) {
          uint256 liquidationCover = (uint256(negativeValue) *
            positive(virtualBalances[user].uservAssetBalance)) / positive(allShortAssetBalance);
          virtualBalances[user].virtualCollateral -= int256(liquidationCover);
        }
      }
    } else if (virtualBalances[_user].uservAssetBalance < 0) {
      uint256 _assetSize = uint256(positive(virtualBalances[_user].uservAssetBalance));
      int256 negativeValue = _getNewAccountValue(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);

      collateral[usdc][_user] = 0;
      virtualBalances[_user].virtualCollateral = 0;
      //update total balances
      _updateAllvAssetBalances(virtualBalances[_user].uservAssetBalance, -virtualBalances[_user].uservAssetBalance);
      _updateAllvUsdBalances(virtualBalances[_user].uservUsdBalance, -virtualBalances[_user].uservUsdBalance);
      //update user balance
      virtualBalances[_user].uservAssetBalance = 0;
      virtualBalances[_user].uservUsdBalance = 0;
      // if user has not vbalance so he is not active
      _removeActiveUser(_user);
      //update the pool
      uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
      pool.vAssetPoolSize -= _assetSize;
      pool.vUsdPoolSize = k / pool.vAssetPoolSize;
      //update the new pool size
      vAssetNewPoolSize -= _assetSize;
      vUsdNewPoolSize = k / vAssetNewPoolSize;
      //set events
      emit HardLiquidate(_user, marketPrice(), block.timestamp, _assetSize, positive(negativeValue));
      emit Price(marketPrice(), _assetSize, block.timestamp, pool.vAssetPoolSize, pool.vUsdPoolSize); 
      // reduce long users virtual collateral
      (int256 allLongvAssetBalance,,,) = getTotalBalances();
      for (uint256 i = 0; i < activeUsers.length; i++) {
        address user = activeUsers[i];
        if (virtualBalances[user].uservAssetBalance > 0) {
          uint256 liquidationCover = (uint256(negativeValue) *
            uint256(virtualBalances[user].uservAssetBalance)) / uint256(allLongvAssetBalance);
          virtualBalances[user].virtualCollateral -= int256(liquidationCover);
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
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) public view returns (uint256) {
    int256 totalAccountValue = _getNewAccountValue(_user, _vAssetNewPoolSize, _vUsdNewPoolSize);
    uint256 totalPositionNotional = _getNewPositionNotional(
      _user,
      _vAssetNewPoolSize,
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
    uint256 _vAssetNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal returns (uint256 vAssetNewPoolSize, uint256 vUsdNewPoolSize) {
    require(
      _isPartialLiquidatable(_user, _vAssetNewPoolSize, _vUsdNewPoolSize),
      "user can not be partially liquidated"
    );
    
    vAssetNewPoolSize = _vAssetNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;

    uint256 liquidateAmount = _calculatePartialLiquidateValue(
      _user,
      _vAssetNewPoolSize,
      _vUsdNewPoolSize
    );
    //uint AssetLiquidateAmount = liquidateAmount*pool.vAssetPoolSize/pool.vUsdPoolSize;
    // return AssetLiquidateAmount;
    if (virtualBalances[_user].uservAssetBalance > 0) {
      // _closeLongPosition(_user, AssetLiquidateAmount);

      //get the output usd of closing position
      // uint256 usdAssetValue = getShortVusdAmountOut(AssetLiquidateAmount);
      uint256 usdAssetValue = liquidateAmount;
      uint256 AssetLiquidateAmount = getShortAssetAmountOut(usdAssetValue);
      int256 userPartialvUsdBalance = (virtualBalances[_user].uservUsdBalance *
        int256(AssetLiquidateAmount)) / virtualBalances[_user].uservAssetBalance;

      //increase or decrease the user pnl for this function
      if (usdAssetValue > (positive(userPartialvUsdBalance))) {
        uint256 pnl = usdAssetValue - (positive(userPartialvUsdBalance));
        collateral[usdc][_user] += pnl;
      } else if (usdAssetValue < (positive(userPartialvUsdBalance))) {
        uint256 pnl = (positive(userPartialvUsdBalance) - usdAssetValue);
        collateral[usdc][_user] -= pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
      if (realizeVirtualCollAmount != 0) {
        _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      }
      //update total balances
      _updateAllvAssetBalances(virtualBalances[_user].uservAssetBalance, -int256(AssetLiquidateAmount));
      _updateAllvUsdBalances(virtualBalances[_user].uservUsdBalance, absoluteInt(userPartialvUsdBalance));
      //update user balance
      virtualBalances[_user].uservAssetBalance -= int256(AssetLiquidateAmount);
      virtualBalances[_user].uservUsdBalance += absoluteInt(userPartialvUsdBalance);
      // if user has not vbalance so he is not active
      if (
        virtualBalances[_user].uservAssetBalance == 0 && virtualBalances[_user].uservUsdBalance == 0
      ) {
        _removeActiveUser(_user);
      }
      //update the pool
      uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
      pool.vAssetPoolSize += AssetLiquidateAmount;
      pool.vUsdPoolSize = k / pool.vAssetPoolSize;
      //update the newPoolSize
      vAssetNewPoolSize += AssetLiquidateAmount;
      vUsdNewPoolSize = k / vAssetNewPoolSize;
      //set events
      emit PartialLiquidate(msg.sender, marketPrice(), block.timestamp, AssetLiquidateAmount, positive(userPartialvUsdBalance));
      emit Price(marketPrice(), AssetLiquidateAmount, block.timestamp, pool.vAssetPoolSize, pool.vUsdPoolSize);
    } else if (virtualBalances[_user].uservAssetBalance < 0) {
      //get the output usd of closing position
      uint256 usdAssetValue = liquidateAmount;
      uint256 AssetLiquidateAmount = getLongAssetAmountOut(usdAssetValue);
      int256 userPartialvUsdBalance = (virtualBalances[_user].uservUsdBalance *
        int256(AssetLiquidateAmount)) / virtualBalances[_user].uservAssetBalance;
      //increase or decrease pnl of the user
      if (usdAssetValue > uint256(positive(userPartialvUsdBalance))) {
        uint256 pnl = usdAssetValue - uint256(positive(userPartialvUsdBalance));
        collateral[usdc][_user] -= pnl;
      }
      if (usdAssetValue < (positive(userPartialvUsdBalance))) {
        uint256 pnl = (positive(userPartialvUsdBalance) - usdAssetValue);
        collateral[usdc][_user] += pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = virtualBalances[_user].virtualCollateral;
      if (realizeVirtualCollAmount != 0) {
        _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      }
      //update total balances
      _updateAllvAssetBalances(virtualBalances[_user].uservAssetBalance, int256(AssetLiquidateAmount));
      _updateAllvUsdBalances(virtualBalances[_user].uservUsdBalance, -absoluteInt(userPartialvUsdBalance));
      //update user balance
      virtualBalances[_user].uservAssetBalance += int256(AssetLiquidateAmount);
      virtualBalances[_user].uservUsdBalance -= absoluteInt(userPartialvUsdBalance);
      // if user has not vbalance so he is not active
      if (
        virtualBalances[_user].uservAssetBalance == 0 && virtualBalances[_user].uservUsdBalance == 0
      ) {
        _removeActiveUser(_user);
      }
      //update pool
      uint256 k2 = pool.vAssetPoolSize * pool.vUsdPoolSize;
      pool.vAssetPoolSize -= AssetLiquidateAmount;
      pool.vUsdPoolSize = k2 / pool.vAssetPoolSize;
      //update the newPoolSize
      vAssetNewPoolSize -= AssetLiquidateAmount;
      vUsdNewPoolSize = k2 / vAssetNewPoolSize;
      //set events
      emit PartialLiquidate(msg.sender, marketPrice(), block.timestamp, AssetLiquidateAmount, positive(userPartialvUsdBalance));
      emit Price(marketPrice(), AssetLiquidateAmount, block.timestamp, pool.vAssetPoolSize, pool.vUsdPoolSize);
    }
    uint256 discountAmount = (liquidateAmount * discountRate) / 100;
    collateral[usdc][_user] -= discountAmount;
    liquidationFee += discountAmount;
  }

  //liquidate users according to the new price (is used only in trade trade functions)
  function _hardLiquidateUsers(uint256 _vAssetNewPoolSize, uint256 _vUsdNewPoolSize)
    internal
    returns (uint256 vAssetNewPoolSize, uint256 vUsdNewPoolSize)
  {
    vAssetNewPoolSize = _vAssetNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isLiquidatable = _isHardLiquidatable(
          activeUsers[i],
          vAssetNewPoolSize,
          vUsdNewPoolSize
        );
        if (isLiquidatable == true) {
          int256 userMargin = _userNewMargin(activeUsers[i], vAssetNewPoolSize, vUsdNewPoolSize);
          if (userMargin > 0) {
            (vAssetNewPoolSize, vUsdNewPoolSize) = _hardLiquidate(
              activeUsers[i],
              vAssetNewPoolSize,
              vUsdNewPoolSize
            );
          } else if (userMargin < 0) {
            (vAssetNewPoolSize, vUsdNewPoolSize) = _hardNegativeLiquidate(
              activeUsers[i],
              vAssetNewPoolSize,
              vUsdNewPoolSize
            );
          }
        }
      }
    }
  }

  //liquidate users partialy according to the new price (is used only in trade trade functions)
  function _partialLiquidateUsers(uint256 _vAssetNewPoolSize, uint256 _vUsdNewPoolSize)
    internal
    returns (uint256 vAssetNewPoolSize, uint256 vUsdNewPoolSize)
  {
    vAssetNewPoolSize = _vAssetNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isPartialLiquidatable = _isPartialLiquidatable(
          activeUsers[i],
          vAssetNewPoolSize,
          vUsdNewPoolSize
        );
        if (isPartialLiquidatable == true) {
          (vAssetNewPoolSize, vUsdNewPoolSize) = _partialLiquidate(
            activeUsers[i],
            vAssetNewPoolSize,
            vUsdNewPoolSize
          );
        }
      }
    }
  }

  function getTotalBalances() public view returns (int256, int256, int256, int256) {
    int256 allLongAssetBalance;
    int256 allShortAssetBalance;
    int256 allLongUsdBalance;
    int256 allShortUsdBalance;
    for (uint256 i; i < activeUsers.length; i++) {
      address user = activeUsers[i];
      int256 vAssetBalance = virtualBalances[user].uservAssetBalance;
      int256 vUsdBalance = virtualBalances[user].uservUsdBalance;
      //calculate asset balances
      if (vAssetBalance > 0) {
        allLongAssetBalance += vAssetBalance;
      }else{
        allShortAssetBalance += vAssetBalance;
      }
      //calculate asset balances
      if (vUsdBalance > 0) {
        allShortUsdBalance += vUsdBalance;
      }else{
        allLongUsdBalance += vUsdBalance;
      }
    }
    
    return (
      allLongAssetBalance,
      allShortAssetBalance,
      allLongUsdBalance,
      allShortUsdBalance
    );
  }

  // function getAllShortvAssetBalance() public view returns (int256) {
  //   int256 allShortAssetBalance;
  //   for (uint256 i; i < activeUsers.length; i++) {
  //     address user = activeUsers[i];
  //     int256 vAssetBalance = virtualBalances[user].uservAssetBalance;
  //     if (vAssetBalance < 0) {
  //       allShortAssetBalance += vAssetBalance;
  //     }
  //   }
  //   return allShortAssetBalance;
  // }

  function setFundingRate() external {
    uint fundingFractionTime = exchangeInfo.lastUpdateTime();
    bool isFundingRateUsed = exchangeInfo.isFundingRateUsed(assetName);
    require(block.timestamp - fundingFractionTime < 60 minutes, "Funding rate update time should not pass more than 60 minutes.");
    require(isFundingRateUsed == false, "This funding rate is used befor");
    int fundingFraction = exchangeInfo.assetFundingfractionaverage(assetName);
    uint oraclePrice = exchangeInfo.assetPrice(assetName);
    require(fundingFraction != 0, "Funding fraction should not be zero");
    require(oraclePrice != 0, "Oracle price should not be zero");
    //first the contract check actual vAsset positions balance of users
    // (int256 allLongvAssetBalance, int256 allShortAssetBalance,,) = getTotalBalances();
    int256 allLongvAssetBalance = allLongvAssetBalances;
    int256 allShortAssetBalance = allShortvAssetBalances;
    //check if we dont have one side(long or short balance = 0) this funding action will not run
    if (allLongvAssetBalance > 0 && allShortAssetBalance < 0) {
      if (fundingFraction > 0) {
        int256 minOpenInterest = (
          absoluteInt(allLongvAssetBalance) > absoluteInt(allShortAssetBalance)
            ? absoluteInt(allShortAssetBalance)
            : absoluteInt(allLongvAssetBalance)
        );
        // uint256 difference = currentPrice - oraclePrice;
        uint256 fundingFee = (uint256(minOpenInterest) * uint(fundingFraction))/1e18/24;
        for (uint256 i = 0; i < activeUsers.length; i++) {
          address user = activeUsers[i];
          if (virtualBalances[user].uservAssetBalance > 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee *
              uint256(virtualBalances[user].uservAssetBalance)) / uint256(allLongvAssetBalance);
            virtualBalances[user].virtualCollateral -= int256(userFundingFee);
          } else if (virtualBalances[user].uservAssetBalance < 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee *
              positive(virtualBalances[user].uservAssetBalance)) / positive(allShortAssetBalance);
            virtualBalances[user].virtualCollateral += int256(userFundingFee);
          }
        }
      } else if (fundingFraction < 0) {
        int256 minOpenInterest = (
          absoluteInt(allLongvAssetBalance) > absoluteInt(allShortAssetBalance)
            ? absoluteInt(allShortAssetBalance)
            : absoluteInt(allLongvAssetBalance)
        );
        // uint256 difference = oraclePrice - currentPrice;
        uint256 fundingFee = (uint256(minOpenInterest) * positive(fundingFraction))/1e18/24;
        for (uint256 i = 0; i < activeUsers.length; i++) {
          address user = activeUsers[i];
          if (virtualBalances[user].uservAssetBalance > 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee *
              uint256(virtualBalances[user].uservAssetBalance)) / uint256(allLongvAssetBalance);
            virtualBalances[user].virtualCollateral += int256(userFundingFee);
          } else if (virtualBalances[user].uservAssetBalance < 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee *
              positive(virtualBalances[user].uservAssetBalance)) / positive(allShortAssetBalance);
            virtualBalances[user].virtualCollateral -= int256(userFundingFee);
          }
        }
      }
      lastSetFundingRateTime = block.timestamp;
      exchangeInfo.setFundingRateUsed(assetName, true);
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
  function isPriceIntheRightRange(uint256 _vAssetNewPoolSize, uint256 _vUsdNewPoolSize)
    public
    view
    returns (bool)
  {
    uint256 currentPrice = (1e18 * pool.vUsdPoolSize) / pool.vAssetPoolSize;
    uint256 oraclePrice = exchangeInfo.assetPrice(assetName);
    uint256 newPrice = (1e18 * _vUsdNewPoolSize) / _vAssetNewPoolSize;

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
  function removeLiquidationFee(uint256 _amount) public onlyOwner {
    require(
      _amount <= liquidationFee,
      "Requested collect amount is larger than the ContractFee balance."
    );
    SafeERC20.safeTransfer(IERC20(usdc), msg.sender, _amount);
    liquidationFee -= _amount;
  }

  
  function isLongInRightRange(uint256 _usdAmount) external view returns (bool) {
    uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize + _usdAmount;
    uint256 newvAssetPoolSize = k / newvUsdPoolSize;
    bool isInTheRightRange = isPriceIntheRightRange(newvAssetPoolSize, newvUsdPoolSize);
    return isInTheRightRange;
  }

  function isShortInRightRange(uint256 _usdAmount) external view returns (bool) {
    uint256 k = pool.vAssetPoolSize * pool.vUsdPoolSize;
    uint256 newvUsdPoolSize = pool.vUsdPoolSize - _usdAmount;
    uint256 newvAssetPoolSize = k / newvUsdPoolSize;
    bool isInTheRightRange = isPriceIntheRightRange(newvAssetPoolSize, newvUsdPoolSize);
    return isInTheRightRange;
  }
  
  function marketPrice() public view returns (uint256) {
    return (1e18 * pool.vUsdPoolSize) / pool.vAssetPoolSize;
  }
}