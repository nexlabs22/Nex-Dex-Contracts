// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

// @title Nex Exchange smart contract

contract Exchange is Ownable, Pausable, ReentrancyGuard {
  using SafeMath for uint256;

  AggregatorV3Interface internal nftFloorPriceFeed;

  AggregatorV3Interface public priceFeed;

  address public usdc;


  
  uint256 public insuranceFunds;

  uint8 public discountRate = 20; //20%
  uint8 public saveLevelMargin = 60; //60%
  uint8 public maintenanceMargin = 50; //50%
  uint8 public AutoCloseMargin = 40; //40%

  uint8 public swapFee = 10; //=> 10/10000 = 0.1%
  uint256 public latestFeeUpdate;

  address[] liquidateList;

  uint256 public vBaycPoolSize;
  uint256 public vUsdPoolSize;

  address[] public activeUsers;

  mapping(address => mapping(address => uint256)) public collateral; //collateral[tokenaddress][useraddress]
  mapping(address => int256) public virtualCollateral; //funding reward of each user

  mapping(address => int256) public uservUsdBalance; // virtual usd balance of each user;
  mapping(address => int256) public uservBaycBalance; // virtual nft balance of each user;

  event NewOracle(address oracle);
  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);

  constructor(
    address _nftOracleAddress,
    address _priceFeed,
    address _usdc
  ) {
    nftFloorPriceFeed = AggregatorV3Interface(_nftOracleAddress);
    priceFeed = AggregatorV3Interface(_priceFeed);
    usdc = _usdc;
  }



  //get nft Price in ETH
  function showPriceETH() public view returns(uint){
        int nftPrice = getLatestNftPrice();
        return uint(nftPrice);
    }

  //get nft price in USD
  function showPriceUSD() public view returns(uint){
        uint price = showPriceETH();
        int ethPrice = getEthUsdPrice()*1e10;
        return price*uint(ethPrice)/1e18;
    }

  //get eth/usd price
  function getEthUsdPrice() public view returns (int) {
        (
            /*uint80 roundID*/,
            int price,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = priceFeed.latestRoundData();
        return price;
    }
  
  function getLatestNftPrice() public view returns (int) {
        (
            /*uint80 roundID*/,
            int nftFloorPrice,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = nftFloorPriceFeed.latestRoundData();
        return nftFloorPrice;
    }

  //check is user exist in activeUsers array
  function doesUserExist(address _user) public view returns (bool) {
    for (uint256 i; i < activeUsers.length; i++) {
      if (activeUsers[i] == _user) {
        return true;
      }
    }
    return false;
  }

  //add user to the active user list (first check if its not)
  function _addActiveUser(address _user) internal {
    bool isExist = doesUserExist(_user);
    if (isExist == false) {
      activeUsers.push(_user);
    }
  }

  //remove user from active users list
  function _removeActiveUser(address _user) internal {
    bool isExist = doesUserExist(_user);
    if (isExist == true) {
      for (uint256 i; i < activeUsers.length; i++) {
        if (activeUsers[i] == _user) {
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
    uint oraclePrice = showPriceUSD();
    vBaycPoolSize = _assetSize;
    vUsdPoolSize = _assetSize*oraclePrice/1e18;
  }


  function changeNftOracleAddress(address _newAddress) public onlyOwner {
    nftFloorPriceFeed = AggregatorV3Interface(_newAddress);
  }

  //Notice: newFee should be between 1 to 500 (0.01% - 5%)
  function setSwapFee(uint8 _newFee) public onlyOwner {
    uint256 distance = block.timestamp - latestFeeUpdate;
    require(distance / 60 / 60 > 12, "You should wait at least 12 hours after latest update");
    require(_newFee <= 500 && _newFee >= 1, "newFee should be between 1 to 500");
    swapFee = _newFee;
    latestFeeUpdate = block.timestamp;
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
      int256 newAccountValue = totalAccountValue - int(_amount);
      int256 newMargin = (100 * newAccountValue) / int(totalPositionNotional);
      require(
        newMargin > int8(saveLevelMargin),
        "You cannot withdraw because your margin rate is the lower than saveMargin level"
      );
    }
    //check user has enough collateral
    require(
      collateral[usdc][msg.sender] >= _amount,
      "Desire amount is more than collateral balance"
    );
    //transfer tokens to the user
    SafeERC20.safeTransfer(IERC20(usdc), msg.sender, _amount);
    collateral[usdc][msg.sender] = collateral[usdc][msg.sender].sub(_amount);
    emit Withdraw(usdc, msg.sender, _amount, collateral[usdc][msg.sender]);
  }

  //give the user funding reward when position will be closed
  function _realizevirtualCollateral(address _user, int256 _amount) internal {
    require(_amount <= absoluteInt(virtualCollateral[_user]), "out of vitrual collateral balance");
    if (virtualCollateral[_user] > 0) {
      collateral[usdc][_user] += uint256(_amount);
      virtualCollateral[_user] -= _amount;
    } else if (virtualCollateral[_user] < 0) {
      collateral[usdc][_user] -= uint256(_amount);
      virtualCollateral[_user] += _amount;
    }
  }

  //get output Bayc by usd input amount if we want to buy(long)
  //how much Bayc we will get by paying usd for long
  function getLongBaycAmountOut(uint256 _vUsdAmount) public view returns (uint256) {
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize + _vUsdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = vBaycPoolSize - newvBaycPoolSize;
    return userBayc;
  }

  //get output usd amount by Bayc input amount if we want to buy(long)
  function getLongVusdAmountOut(uint256 _vBaycAmount) public view returns (uint256) {
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvBaycPoolSize = vBaycPoolSize - _vBaycAmount;
    uint256 newvUsdPoolSize = k / newvBaycPoolSize;
    uint256 uservUsd = newvUsdPoolSize - vUsdPoolSize;
    return uservUsd;
  }

  //get output Bayc by usd input amount if we want to sell(short)
  function getShortBaycAmountOut(uint256 _vUsdAmount) public view returns (uint256) {
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize - _vUsdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = newvBaycPoolSize - vBaycPoolSize;
    return userBayc;
  }

  //get output usd by Bayc input amount if we want to sell(short)
  function getShortVusdAmountOut(uint256 _vBaycAmount) public view returns (uint256) {
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvBaycPoolSize = vBaycPoolSize + _vBaycAmount;
    uint256 newvUsdPoolSize = k / newvBaycPoolSize;
    uint256 uservUsd = vUsdPoolSize - newvUsdPoolSize;
    return uservUsd;
  }

  //I use int for negative/positve numbers for user bayc and usd balance(wich might be negative)
  //so for some point we need to convert them to uint so they should be positive
  //f.e positive(-1)=1
  function positive(int256 _amount) public view returns (uint256) {
    if (_amount < 0) {
      int256 posAmount = -(_amount);
      return uint256(posAmount);
    } else {
      return uint256(_amount);
    }
  }

  function oraclePrice() public view returns(uint256){
    uint oraclePrice = showPriceUSD();
    return oraclePrice;
  }

  function getCurrentExchangePrice() public view returns(uint256){
    return 1e18*vUsdPoolSize/vBaycPoolSize;
  }

  function openLongPosition(uint256 _usdAmount) public {
    //calculate the new pool size and user bayc amount
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize + _usdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    /*
    bool isInTheRightRange = isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    require(
      isInTheRightRange == true,
      "You can't move the price more than 10% far from the oracle price"
    );
    */
    bool isNewMarginHardLiquidateable = _isNewMarginLiquidatable(msg.sender, _usdAmount, newvBaycPoolSize, newvUsdPoolSize);
    require(
      isNewMarginHardLiquidateable == false,
      "You can't open this position because you probability will be liquidated by this margin"
    );

    //first we run liquidation functions
    (newvBaycPoolSize, newvUsdPoolSize) = _hardLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);
    (newvBaycPoolSize, newvUsdPoolSize) = _partialLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);
    
    uint256 userBayc = vBaycPoolSize - newvBaycPoolSize;
    //update bayc and usd balance of user
    uservBaycBalance[msg.sender] += int256(userBayc);
    uservUsdBalance[msg.sender] -= int256(_usdAmount);

    //add user to the active user list
    _addActiveUser(msg.sender);

    //trade fee
    uint256 fee = (_usdAmount * swapFee) / 10000;
    collateral[usdc][msg.sender] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);

    //update pool
    vBaycPoolSize = newvBaycPoolSize;
    vUsdPoolSize = newvUsdPoolSize;
  }


  function openShortPosition(uint256 _usdAmount) public {
    //calculate the new pool size and user bayc amount
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize - _usdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    /*
    bool isInTheRightRange = isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    require(
      isInTheRightRange == true,
      "You can't move the price more than 10% far from the oracle price"
    );
    */
    bool isNewMarginHardLiquidateable = _isNewMarginLiquidatable(msg.sender, _usdAmount, newvBaycPoolSize, newvUsdPoolSize);
    require(
      isNewMarginHardLiquidateable == false,
      "You can't open this position because you probability will be liquidated by this margin"
    );
    
    //first we run liquidation functions
    (newvBaycPoolSize, newvUsdPoolSize) = _hardLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);
    (newvBaycPoolSize, newvUsdPoolSize) = _partialLiquidateUsers(newvBaycPoolSize, newvUsdPoolSize);

    k = vBaycPoolSize * vUsdPoolSize;
    newvUsdPoolSize = vUsdPoolSize - _usdAmount;
    newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = newvBaycPoolSize - vBaycPoolSize;
    //update bayc and usd balance of user
    uservBaycBalance[msg.sender] -= int256(userBayc);
    uservUsdBalance[msg.sender] += int256(_usdAmount);

    //add user to the active user list
    _addActiveUser(msg.sender);

    //trade fee
    uint256 fee = (_usdAmount * swapFee) / 10000;
    collateral[usdc][msg.sender] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);

    //update pool
    vBaycPoolSize = newvBaycPoolSize;
    vUsdPoolSize = newvUsdPoolSize;
  }


  

  function _closeLongPosition(address _user, uint256 _assetSize) internal {
    require(
      _assetSize <= positive(uservBaycBalance[_user]),
      "You dont have enough asset size to close the long position"
    );

    uint256 k;
    //first we run liquidation functions
    k = vBaycPoolSize * vUsdPoolSize;
    uint256 vBaycNewPoolSize = vBaycPoolSize + _assetSize;
    uint256 vUsdNewPoolSize = k / vBaycNewPoolSize;

    //liquidate users
    (vBaycNewPoolSize, vUsdNewPoolSize) = _partialLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);
    (vBaycNewPoolSize, vUsdNewPoolSize) = _hardLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);
    

    //get the output usd of closing position
    //f.e 1Bayc -> 2000$
    uint256 usdBaycValue = getShortVusdAmountOut(_assetSize);
    
    int256 userPartialvUsdBalance = (uservUsdBalance[_user] * int256(_assetSize)) /
      uservBaycBalance[_user];

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
    int256 realizeVirtualCollAmount = (virtualCollateral[_user] * int256(_assetSize)) /
      uservBaycBalance[_user];
    _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
    //update user balance
    uservBaycBalance[_user] -= int256(_assetSize);
    uservUsdBalance[_user] += absoluteInt(userPartialvUsdBalance);
    // if user has not vbalance so he is not active
    if (uservBaycBalance[_user] == 0 && uservUsdBalance[_user] == 0) {
      _removeActiveUser(_user);
    }

    //trade fee
    uint256 fee = (usdBaycValue * swapFee) / 10000;
    collateral[usdc][_user] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);

    //update the pool
    k = vBaycPoolSize * vUsdPoolSize;
    vBaycPoolSize += _assetSize;
    vUsdPoolSize = k / vBaycPoolSize;
  }

  function _closeShortPosition(address _user, uint256 _assetSize) internal {
    require(
      _assetSize <= positive(uservBaycBalance[_user]),
      "You dont have enough asset size to close the short position"
    );

    uint256 k;
    //first we run liquidation functions
    k = vBaycPoolSize * vUsdPoolSize;
    uint256 vBaycNewPoolSize = vBaycPoolSize - _assetSize;
    uint256 vUsdNewPoolSize = k / vBaycNewPoolSize;
    
    //liquidate users
    (vBaycNewPoolSize, vUsdNewPoolSize) = _partialLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);
    (vBaycNewPoolSize, vUsdNewPoolSize) = _hardLiquidateUsers(vBaycNewPoolSize, vUsdNewPoolSize);
    //get the output usd of closing position
    uint256 usdBaycValue = getLongVusdAmountOut(_assetSize);
    int256 userPartialvUsdBalance = (uservUsdBalance[_user] * int256(_assetSize)) /
      uservBaycBalance[_user];
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
    int256 realizeVirtualCollAmount = (virtualCollateral[_user] * int256(_assetSize)) /
      uservBaycBalance[_user];
    _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
    //update user balance
    uservBaycBalance[_user] += int256(_assetSize);
    uservUsdBalance[_user] -= absoluteInt(userPartialvUsdBalance);
    // if user has not vbalance so he is not active
    if (uservBaycBalance[_user] == 0 && uservUsdBalance[_user] == 0) {
      _removeActiveUser(_user);
    }
    //trade fee
    uint256 fee = (usdBaycValue * swapFee) / 10000;
    collateral[usdc][_user] -= fee;
    address owner = owner();
    SafeERC20.safeTransfer(IERC20(usdc), owner, fee);
    //update pool
    k = vBaycPoolSize * vUsdPoolSize;
    vBaycPoolSize -= _assetSize;
    vUsdPoolSize = k / vBaycPoolSize;
  }

  function closePositionComplete() public {
    uint assetSize = positive(uservBaycBalance[msg.sender]);
    closePosition(assetSize);
  }

  function closePosition(uint256 _assetSize) public {
    require(
      _assetSize <= positive(uservBaycBalance[msg.sender]),
      "You dont have enough asset size to close the all positions"
    );
    //if user has positive vBayc balance so he/she has longPosition
    //if user has negative vBayc balance so he/she has shortPosition
    if (uservBaycBalance[msg.sender] > 0) {
      _closeLongPosition(msg.sender, _assetSize);
    } else if (uservBaycBalance[msg.sender] < 0) {
      _closeShortPosition(msg.sender, _assetSize);
    }
  }

  //return the pnl of user
  /*
  user vBayc balance = 2Bayc
  user vUsd balance = -3000
  currnent 2 vBayc value =  4000
  user pnl = 4000 - positive(-3000) = 1000$
  */
  function getPNL(address _user) public view returns (int256) {
    if (uservBaycBalance[_user] > 0) {
      uint256 currentBaycValue = getShortVusdAmountOut(uint256(uservBaycBalance[_user]));
      int256 pnl = int256(currentBaycValue) + (uservUsdBalance[_user]);
      return pnl;
    } else if (uservBaycBalance[_user] < 0) {
      uint256 currentBaycValue = getLongVusdAmountOut(positive(uservBaycBalance[_user]));
      int256 pnl = uservUsdBalance[_user] - int256(currentBaycValue);
      return pnl;
    }
  }

  //get user pnl by new pool size(new price);
  function _getNewPNL(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal view returns (int256) {
    if (uservBaycBalance[_user] > 0) {
      uint256 k = _vBaycNewPoolSize * _vUsdNewPoolSize;
      uint256 newvBaycPoolSize = _vBaycNewPoolSize + uint256(uservBaycBalance[_user]);
      uint256 newvUsdPoolSize = k / newvBaycPoolSize;
      uint256 currentBaycValue = _vUsdNewPoolSize - newvUsdPoolSize;
      int256 pnl = int256(currentBaycValue) + (uservUsdBalance[_user]);
      return pnl;
    } else if (uservBaycBalance[_user] < 0) {
      uint256 k = _vBaycNewPoolSize * _vUsdNewPoolSize;
      uint256 newvBaycPoolSize = _vBaycNewPoolSize - positive(uservBaycBalance[_user]);
      uint256 newvUsdPoolSize = k / newvBaycPoolSize;
      uint256 currentBaycValue = newvUsdPoolSize - _vUsdNewPoolSize;
      int256 pnl = uservUsdBalance[_user] - int256(currentBaycValue);
      return pnl;
    }
  }

  //account value = collateral +- pnl
  function getAccountValue(address _user) public view returns (int256) {
    uint256 collateralValue = collateral[usdc][_user];
    int256 pnl = getPNL(_user);
    int256 fundingReward = virtualCollateral[_user];
    int256 accountValue = int256(collateralValue) + pnl + fundingReward;
    return accountValue;
  }

  //get new account value according to the new pool size (new price)
  function _getNewAccountValue(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal view returns (int256) {
    uint256 collateralValue = collateral[usdc][_user];
    int256 pnl = _getNewPNL(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    int256 fundingReward = virtualCollateral[_user];
    int256 accountValue = int256(collateralValue) + pnl + fundingReward;
    // int256 accountValue = int256(collateralValue);
    return accountValue;
  }

  //get total position value of each user
  function getPositionNotional(address _user) public view returns (uint256) {
    if (uservBaycBalance[_user] > 0) {
      uint256 positionNotionalValue = getShortVusdAmountOut(uint256(uservBaycBalance[_user]));
      return positionNotionalValue;
    } else if (uservBaycBalance[_user] < 0) {
      uint256 positionNotionalValue = getLongVusdAmountOut(positive(uservBaycBalance[_user]));
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
  ) internal view returns (uint256) {
    if (uservBaycBalance[_user] > 0) {
      uint256 k = _vBaycNewPoolSize * _vUsdNewPoolSize;
      uint256 newvBaycPoolSize = _vBaycNewPoolSize + uint256(uservBaycBalance[_user]);
      uint256 newvUsdPoolSize = k / newvBaycPoolSize;
      uint256 positionNotionalValue = _vUsdNewPoolSize - newvUsdPoolSize;
      return positionNotionalValue;
    } else if (uservBaycBalance[_user] < 0) {
      uint256 k = _vBaycNewPoolSize * _vUsdNewPoolSize;
      uint256 newvBaycPoolSize = _vBaycNewPoolSize - positive(uservBaycBalance[_user]);
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
      int256 margin = (100 * accountValue) / int(positionNotional);
      return margin;
    }else{
      return 0;
    }
  }

  //get the new margin of user according to the new pool size (new price)
  function _userNewMargin(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal view returns (int256) {
    int256 accountValue = _getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    uint256 positionNotional = _getNewPositionNotional(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    if (accountValue > 0 && positionNotional > 0) {
      int256 margin = (100 * accountValue) / int(positionNotional);
      return margin;
    } if (accountValue < 0 && positionNotional > 0) {
      int256 margin = (100 * accountValue) / int(positionNotional);
      return margin;
    } else{
      return 0;
    }
  }

  function isHardLiquidateable(address _user) public view returns (bool) {
    int256 userMargin = userMargin(_user);
    if (userMargin != 0 && userMargin <= 40) {
      return true;
    } else {
      return false;
    }
  }



  //ckeck that is user can be liquidated according to the new price
  function _isHardLiquidateable(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal view returns (bool) {
    int256 userMargin = _userNewMargin(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    if (userMargin != 0 && userMargin <= 40) {
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
  ) public view returns(bool){
    int256 accountValue = _getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    uint256 positionNotional = _getNewPositionNotional(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    uint256 newPositionNotional = positionNotional + _usdAmount;
    int newMargin = 100*(accountValue)/int(newPositionNotional);
    if (newMargin != 0 && newMargin <= int8(saveLevelMargin)) {
      return true;
    } else {
      return false;
    }
  }

  function isPartialLiquidateable(address _user) public view returns (bool) {
    
    int256 userMargin = userMargin(_user);
    if (40 <= userMargin && userMargin <= 50) {
      return true;
    } else {
      return false;
    }
    
  }

  //ckeck that is user can be partialy liquidated according to the new price
  function _isPartialLiquidateable(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal view returns (bool) {
    int256 userMargin = _userNewMargin(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    if (40 <= userMargin && userMargin <= 50) {
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
  ) internal returns(uint vBaycNewPoolSize, uint vUsdNewPoolSize) {
    require(
      _isHardLiquidateable(_user, _vBaycNewPoolSize, _vUsdNewPoolSize),
      "user can not be liquidate"
    );
    vBaycNewPoolSize = _vBaycNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    if (uservBaycBalance[_user] > 0) {
      // _closeLongPosition(_user, uint256(uservBaycBalance[_user]));
      uint256 _assetSize = uint256(uservBaycBalance[_user]);
      uint256 usdBaycValue = getShortVusdAmountOut(_assetSize);
      //increase or decrease the user pnl for this function
      if (usdBaycValue > uint256(positive(uservUsdBalance[_user]))) {
        uint256 pnl = usdBaycValue - uint256(positive(uservUsdBalance[_user]));
        collateral[usdc][_user] += pnl;
      } else if (usdBaycValue < uint256(positive(uservUsdBalance[_user]))) {
        uint256 pnl = uint256(positive(uservUsdBalance[_user]) - usdBaycValue);
        collateral[usdc][_user] -= pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = (virtualCollateral[_user] * int256(_assetSize)) /
        uservBaycBalance[_user];
      _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      //update user balance
      uservBaycBalance[_user] -= int256(_assetSize);
      uservUsdBalance[_user] += absoluteInt(uservUsdBalance[_user]);
      // if user has not vbalance so he is not active
      if (uservBaycBalance[_user] == 0 && uservUsdBalance[_user] == 0) {
        _removeActiveUser(_user);
      }
      //update the pool
      uint256 k = vBaycPoolSize * vUsdPoolSize;
      vBaycPoolSize += _assetSize;
      vUsdPoolSize = k / vBaycPoolSize;
      //update the new pool size
      vBaycNewPoolSize += _assetSize;
      vUsdNewPoolSize = k / vBaycNewPoolSize;
    } else if (uservBaycBalance[_user] < 0) {
      uint256 _assetSize = uint256(positive(uservBaycBalance[_user]));
      uint256 usdBaycValue = getShortVusdAmountOut(_assetSize);
      //increase or decrease the user pnl for this function
      if (usdBaycValue > uint256(uservUsdBalance[_user])) {
        uint256 pnl = usdBaycValue - uint256(positive(uservUsdBalance[_user]));
        collateral[usdc][_user] -= pnl;
      } else if (usdBaycValue < uint256(uservUsdBalance[_user])) {
        uint256 pnl = uint256(positive(uservUsdBalance[_user]) - usdBaycValue);
        collateral[usdc][_user] += pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = (virtualCollateral[_user] * int256(_assetSize)) /
        uservBaycBalance[_user];
      _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      //update user balance
      uservBaycBalance[_user] += int256(_assetSize);
      uservUsdBalance[_user] -= uservUsdBalance[_user];
      // if user has not vbalance so he is not active
      if (uservBaycBalance[_user] == 0 && uservUsdBalance[_user] == 0) {
        _removeActiveUser(_user);
      }
      //update the pool
      uint256 k = vBaycPoolSize * vUsdPoolSize;
      vBaycPoolSize -= _assetSize;
      vUsdPoolSize = k / vBaycPoolSize;
      //update the new pool size
      vBaycNewPoolSize -= _assetSize;
      vUsdNewPoolSize = k / vBaycNewPoolSize;
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
  ) public returns(uint256 vBaycNewPoolSize, uint256 vUsdNewPoolSize) {
    require(
      _isHardLiquidateable(_user, _vBaycNewPoolSize, _vUsdNewPoolSize),
      "user can not be liquidate"
    );
    vBaycNewPoolSize = _vBaycNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    if (uservBaycBalance[_user] > 0) {
      
      uint256 _assetSize = uint256(uservBaycBalance[_user]);
      int256 negativeValue = _getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
      
      collateral[usdc][_user] = 0;
      virtualCollateral[_user] = 0;
      //update user balance
      uservBaycBalance[_user] -= int256(_assetSize);
      uservUsdBalance[_user] += absoluteInt(uservUsdBalance[_user]);
      // if user has not vbalance so he is not active
      if (uservBaycBalance[_user] == 0 && uservUsdBalance[_user] == 0) {
        _removeActiveUser(_user);
      }
      //update the pool
      uint256 k = vBaycPoolSize * vUsdPoolSize;
      vBaycPoolSize += _assetSize;
      vUsdPoolSize = k / vBaycPoolSize;
      //update the new pool size
      vBaycNewPoolSize += _assetSize;
      vUsdNewPoolSize = k / vBaycNewPoolSize;
      // reduce short users virtual collateral
      int256 allShortBaycBalance = getAllShortvBaycBalance();
      for (uint256 i = 0; i < activeUsers.length; i++) {
          address user = activeUsers[i];
          if (uservBaycBalance[user] < 0) {
            uint256 userFundingFee = (uint(negativeValue) * positive(uservBaycBalance[user]))/positive(allShortBaycBalance);
            virtualCollateral[user] -= int256(userFundingFee);
          }
      }

    } else if (uservBaycBalance[_user] < 0) {
      uint256 _assetSize = uint256(positive(uservBaycBalance[_user]));
      int256 negativeValue = _getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);

      
      collateral[usdc][_user] = 0;
      virtualCollateral[_user] = 0;
      
      //update user balance
      uservBaycBalance[_user] += int256(_assetSize);
      uservUsdBalance[_user] -= uservUsdBalance[_user];
      // if user has not vbalance so he is not active
      if (uservBaycBalance[_user] == 0 && uservUsdBalance[_user] == 0) {
        _removeActiveUser(_user);
      }
      //update the pool
      uint256 k = vBaycPoolSize * vUsdPoolSize;
      vBaycPoolSize -= _assetSize;
      vUsdPoolSize = k / vBaycPoolSize;
      //update the new pool size
      vBaycNewPoolSize -= _assetSize;
      vUsdNewPoolSize = k / vBaycNewPoolSize;
      // reduce long users virtual collateral
      int256 allLongvBaycBalance = getAllLongvBaycBalance();
      for (uint256 i = 0; i < activeUsers.length; i++) {
          address user = activeUsers[i];
          if (uservBaycBalance[user] > 0) {
             uint256 userFundingFee = ( uint(negativeValue)* uint256(uservBaycBalance[user])) /
             uint256(allLongvBaycBalance);
             virtualCollateral[user] -= int256(userFundingFee);
          }
      }
    }
  }

  //calculate liquidation amount to turn back the user margin to the save level(60%)
  function calculatePartialLiquidateValue(address _user) public view returns (uint256 x) {
    int256 totalAccountValue = getAccountValue(_user);
    uint256 totalPositionNotional = getPositionNotional(_user);
    uint256 numerator = totalPositionNotional*saveLevelMargin/100 > positive(totalAccountValue) ? totalPositionNotional*saveLevelMargin/100 - positive(totalAccountValue) : positive(totalAccountValue) - totalPositionNotional*saveLevelMargin/100;
    uint256 denominator = saveLevelMargin / 100 - discountRate / 100;
    x = numerator / denominator;
  }

  //calculate liquidation amount to turn back the user margin to the save level(60%) according to the new price
  function _calculatePartialLiquidateValue(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal view returns (uint256) {
    int256 totalAccountValue = _getNewAccountValue(_user, _vBaycNewPoolSize, _vUsdNewPoolSize);
    uint256 totalPositionNotional = _getNewPositionNotional(
      _user,
      _vBaycNewPoolSize,
      _vUsdNewPoolSize
    );
    uint256 numerator = totalPositionNotional*saveLevelMargin/100 > positive(totalAccountValue) ? totalPositionNotional*saveLevelMargin/100 - positive(totalAccountValue) : positive(totalAccountValue) - totalPositionNotional*saveLevelMargin/100;
    uint256 denominator = saveLevelMargin - discountRate;
    uint x = numerator*100/denominator;
    return x;
  }

  

  

  //Liquidate user partialy according to the new price
  function _partialLiquidate(
    address _user,
    uint256 _vBaycNewPoolSize,
    uint256 _vUsdNewPoolSize
  ) internal returns(uint vBaycNewPoolSize, uint vUsdNewPoolSize) {
    require(
      _isPartialLiquidateable(_user, _vBaycNewPoolSize, _vUsdNewPoolSize),
      "user can not be partially liquidated"
    );
    vBaycNewPoolSize = _vBaycNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;

    uint256 liquidateAmount = _calculatePartialLiquidateValue(
      _user,
      _vBaycNewPoolSize,
      _vUsdNewPoolSize
    );
    uint baycLiquidateAmount = liquidateAmount*vBaycPoolSize/vUsdPoolSize;
    // return BaycLiquidateAmount;
    if (uservBaycBalance[_user] > 0) {
      // _closeLongPosition(_user, baycLiquidateAmount);

      //get the output usd of closing position
      uint256 usdBaycValue = getShortVusdAmountOut(baycLiquidateAmount);
      int256 userPartialvUsdBalance = (uservUsdBalance[_user] * int256(baycLiquidateAmount)) /
        uservBaycBalance[_user];

      //increase or decrease the user pnl for this function
      if (usdBaycValue > (positive(userPartialvUsdBalance))) {
        uint256 pnl = usdBaycValue - (positive(userPartialvUsdBalance));
        collateral[usdc][_user] += pnl;
      } else if (usdBaycValue < (positive(userPartialvUsdBalance))) {
        uint256 pnl = (positive(userPartialvUsdBalance) - usdBaycValue);
        collateral[usdc][_user] -= pnl;
      }
      //realize funding reward of user;
      int256 realizeVirtualCollAmount = (virtualCollateral[_user] * int256(baycLiquidateAmount)) /
        uservBaycBalance[_user];
      _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      //update user balance
      uservBaycBalance[_user] -= int256(baycLiquidateAmount);
      uservUsdBalance[_user] += absoluteInt(userPartialvUsdBalance);
      // if user has not vbalance so he is not active
      if (uservBaycBalance[_user] == 0 && uservUsdBalance[_user] == 0) {
        _removeActiveUser(_user);
      }
      //update the pool
      uint256 k = vBaycPoolSize * vUsdPoolSize;
      vBaycPoolSize += baycLiquidateAmount;
      vUsdPoolSize = k / vBaycPoolSize;
      //update the newPoolSize
      vBaycNewPoolSize += baycLiquidateAmount;
      vUsdNewPoolSize = k/vBaycNewPoolSize;
    } else if (uservBaycBalance[_user] < 0) {
      //get the output usd of closing position
      uint256 usdBaycValue = getLongVusdAmountOut(baycLiquidateAmount);
      int256 userPartialvUsdBalance = (uservUsdBalance[_user] * int256(baycLiquidateAmount)) /
        uservBaycBalance[_user];
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
      int256 realizeVirtualCollAmount = (virtualCollateral[_user] * int256(baycLiquidateAmount)) /
        uservBaycBalance[_user];
      _realizevirtualCollateral(_user, absoluteInt(realizeVirtualCollAmount));
      //update user balance
      uservBaycBalance[_user] += int256(baycLiquidateAmount);
      uservUsdBalance[_user] -= absoluteInt(userPartialvUsdBalance);
      // if user has not vbalance so he is not active
      if (uservBaycBalance[_user] == 0 && uservUsdBalance[_user] == 0) {
        _removeActiveUser(_user);
      }
      //update pool
      uint256 k2 = vBaycPoolSize * vUsdPoolSize;
      vBaycPoolSize -= baycLiquidateAmount;
      vUsdPoolSize = k2 / vBaycPoolSize;
      //update the newPoolSize
      vBaycNewPoolSize -= baycLiquidateAmount;
      vUsdNewPoolSize = k2/vBaycNewPoolSize;
    }
    uint256 discountAmount = (liquidateAmount * discountRate) / 100;
    collateral[usdc][_user] -= discountAmount;
    insuranceFunds += discountAmount;
  }

  

  //liquidate users according to the new price (is used only in trade trade functions)
  function _hardLiquidateUsers(uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize) internal returns(uint256 vBaycNewPoolSize, uint256 vUsdNewPoolSize){
    vBaycNewPoolSize = _vBaycNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    for (uint256 i = 0; i < activeUsers.length; i++) {
      if(activeUsers[i] != address(0)){
      bool isLiquidateable = _isHardLiquidateable(
        activeUsers[i],
        vBaycNewPoolSize,
        vUsdNewPoolSize
      );
      if (isLiquidateable == true) {
        int256 userMargin = _userNewMargin(activeUsers[i], vBaycNewPoolSize, vUsdNewPoolSize);
        if(userMargin > 0 ){
        (vBaycNewPoolSize, vUsdNewPoolSize) = _hardLiquidate(activeUsers[i], vBaycNewPoolSize, vUsdNewPoolSize);
        } else if(userMargin < 0) {
        (vBaycNewPoolSize, vUsdNewPoolSize) = _hardNegativeLiquidate(activeUsers[i], vBaycNewPoolSize, vUsdNewPoolSize);
        }
      }
    }
    }
  }

  

  //liquidate users partialy according to the new price (is used only in trade trade functions)
  function _partialLiquidateUsers(uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize) internal returns(uint vBaycNewPoolSize, uint vUsdNewPoolSize) {
    vBaycNewPoolSize = _vBaycNewPoolSize;
    vUsdNewPoolSize = _vUsdNewPoolSize;
    for (uint256 i = 0; i < activeUsers.length; i++) {
      if(activeUsers[i] != address(0)){
      bool isPartialLiquidateable = _isPartialLiquidateable(
        activeUsers[i],
        vBaycNewPoolSize,
        vUsdNewPoolSize
      );
      if (isPartialLiquidateable == true) {
        (vBaycNewPoolSize, vUsdNewPoolSize) = _partialLiquidate(activeUsers[i], vBaycNewPoolSize, vUsdNewPoolSize);
      }
    }
    }
  }


  

  function getAllLongvBaycBalance() public view returns (int256) {
    int256 allLongBaycBalance;
    for (uint256 i; i < activeUsers.length; i++) {
      address user = activeUsers[i];
      int256 vBaycBalance = uservBaycBalance[user];
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
      int256 vBaycBalance = uservBaycBalance[user];
      if (vBaycBalance < 0) {
        allShortBaycBalance += vBaycBalance;
      }
    }
    return allShortBaycBalance;
  }

  function setFundingRate() public onlyOwner {
    uint256 currentPrice = vUsdPoolSize*1e18/vBaycPoolSize;
    uint256 oraclePrice = showPriceUSD();

    //first the contract check actual vBayc positions balance of users
    int256 allLongvBaycBalance = getAllLongvBaycBalance();
    int256 allShortBaycBalance = getAllShortvBaycBalance();

    //check if we dont have one side(long or short balance = 0) this funding action will not run
    if (allLongvBaycBalance > 0 && allShortBaycBalance < 0) {
      if (currentPrice > oraclePrice) {
        int256 minOpenInterest = (
          absoluteInt(allLongvBaycBalance) > absoluteInt(allShortBaycBalance)
            ? absoluteInt(allShortBaycBalance)
            : absoluteInt(allLongvBaycBalance)
        );
        uint difference = currentPrice - oraclePrice;
        uint256 fundingFee = (uint256(minOpenInterest) * difference) / 24e18;
        for (uint256 i = 0; i < activeUsers.length; i++) {
          address user = activeUsers[i];
          if (uservBaycBalance[user] > 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee * uint256(uservBaycBalance[user])) /
              uint256(allLongvBaycBalance);
            virtualCollateral[user] -= int256(userFundingFee);
          } else if (uservBaycBalance[user] < 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee * positive(uservBaycBalance[user]))/positive(allShortBaycBalance);
            virtualCollateral[user] += int256(userFundingFee);
          }
        }
      } else if (currentPrice < oraclePrice) {
        int256 minOpenInterest = (
          absoluteInt(allLongvBaycBalance) > absoluteInt(allShortBaycBalance)
            ? absoluteInt(allShortBaycBalance)
            : absoluteInt(allLongvBaycBalance)
        );
        uint difference = oraclePrice - currentPrice;
        uint256 fundingFee = (uint256(minOpenInterest)*difference)/24e18;
        for (uint256 i = 0; i < activeUsers.length; i++) {
          address user = activeUsers[i];
          if (uservBaycBalance[user] > 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee * uint256(uservBaycBalance[user])) /
            uint256(allLongvBaycBalance);
            virtualCollateral[user] += int(userFundingFee);
          } else if (uservBaycBalance[user] < 0) {
            //change vitraul collateral of user
            uint256 userFundingFee = (fundingFee * positive(uservBaycBalance[user])) /
              positive(allShortBaycBalance);
            virtualCollateral[user] -= int(userFundingFee);
          }
        }
      }
    }
  }





  //return positive int
  function absoluteInt(int256 _value) public view returns (int256) {
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
    uint256 currentPrice = 1e18*vUsdPoolSize / vBaycPoolSize;
    uint256 oraclePrice = showPriceUSD();
    uint256 newPrice = 1e18*_vUsdNewPoolSize / _vBaycNewPoolSize;

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


  // add insurance funds to the contract
  function addInsuranceFunds(uint _amount) public onlyOwner {
    SafeERC20.safeTransferFrom(IERC20(usdc), msg.sender, address(this), _amount);
    insuranceFunds += _amount;
  }

  // remove insurance funds from contract to owner account
  function removeInsuranceFunds(uint _amount) public onlyOwner {
    require(_amount <= insuranceFunds, "greater than insurance funds balance");
    SafeERC20.safeTransfer(IERC20(usdc), msg.sender, _amount);
    insuranceFunds -= _amount;
  }

  function isLongInRightRange(uint256 _usdAmount) public view returns(bool){
   uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize + _usdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    bool isInTheRightRange = isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    return isInTheRightRange;
  }

  function isShortInRightRange(uint256 _usdAmount) public view returns(bool){
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize - _usdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    bool isInTheRightRange = isPriceIntheRightRange(newvBaycPoolSize, newvUsdPoolSize);
    return isInTheRightRange;
  }

  function marketPrice() public view returns(uint){
    return 1e18*vUsdPoolSize / vBaycPoolSize;
  }
}
