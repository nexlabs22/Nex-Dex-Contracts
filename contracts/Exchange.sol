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
import {NftOracle} from "./NftOracle.sol";
import "hardhat/console.sol";

// @title Nex Exchange smart contract

contract Exchange is Ownable, Pausable, ReentrancyGuard {
  using SafeMath for uint256;

  NftOracle public nftOracle;
  AggregatorV3Interface public priceFeed;

  address public usdc;

  bytes32 public latestRequestId; // latest oracle request id (Chainlink)

  bytes32 public specId; //bytes32 jobId
  uint256 public payment; //link amount for call oracle in wei 10000000000000000
  address public assetAddress; //nft address
  string public pricingAsset; // ETH or USD
  uint256 public insuranceFunds;

  uint8 public discountRate = 20; //20%
  uint8 public saveLevelMargin = 60; //60%
  uint8 public maintenanceMargin = 50; //50%
  uint8 public AutoCloseMargin = 40; //40%
  uint8 public swapFee = 1; //1%

  address[] liquidateList;

  uint256 public vBaycPoolSize;
  uint256 public vUsdPoolSize;

  address[] public activeUsers;

  mapping(address => mapping(address => uint256)) public collateral; //collateral[tokenaddress][useraddress]

  mapping(address => int256) public uservUsdBalance; // virtual usd balance of each user;
  mapping(address => int256) public uservBaycBalance; // virtual nft balance of each user;

  event NewOracle(address oracle);
  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);

  constructor(
    address _nftOracleAddress,
    bytes32 _specId,
    uint256 _payment,
    address _assetAddress,
    string memory _pricingAsset,
    address _priceFeed,
    address _usdc
  ) {
    nftOracle = NftOracle(_nftOracleAddress);
    bytes32 requestId = nftOracle.getFloorPrice(_specId, _payment, _assetAddress, _pricingAsset);
    latestRequestId = requestId;
    priceFeed = AggregatorV3Interface(_priceFeed);
    specId = _specId;
    payment = _payment;
    assetAddress = _assetAddress;
    pricingAsset = _pricingAsset;
    usdc = _usdc;
  }

  //check is user exist in activeUsers array
  function isUserExist(address _user) public view returns (bool) {
    for (uint256 i; i < activeUsers.length; i++) {
      if (activeUsers[i] == _user) {
        return true;
      }
    }
    return false;
  }

  //add user to the active user list (first check if its not)
  function addActiveUser(address _user) public {
    bool isExist = isUserExist(_user);
    if (isExist == false) {
      activeUsers.push(_user);
    }
  }

  //remove user from active users list
  function removeActiveUser(address _user) public {
    bool isExist = isUserExist(_user);
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
  function initialVirtualPool(uint256 _assetSize, uint256 _usdSize) public onlyOwner {
    vBaycPoolSize = _assetSize;
    vUsdPoolSize = _usdSize;
  }

  function setSwapFee(uint8 _newFee) public onlyOwner {
    swapFee = _newFee;
  }

  //deposit collateral
  function depositCollateral(uint256 _amount) public {
    IERC20(usdc).transferFrom(msg.sender, address(this), _amount);
    collateral[usdc][msg.sender] = collateral[usdc][msg.sender].add(_amount);
    emit Deposit(usdc, msg.sender, _amount, collateral[usdc][msg.sender]);
  }

  //withdraw collateral
  //befor that the function check user margin
  function withdrawCollateral(uint256 _amount) public {
    //check new margin
    uint256 totalPositionNotional = getPositionNotional(msg.sender);
    uint256 totalAccountValue = getAccountValue(msg.sender);
    if (totalPositionNotional > 0) {
      uint256 newAccountValue = totalAccountValue - _amount;
      uint256 newMargin = (100 * newAccountValue) / totalPositionNotional;
      require(
        newMargin > 60,
        "You cannot withdraw because your margin rate is the lower than saveMargin level"
      );
    }

    //check user has enough collateral
    require(
      collateral[usdc][msg.sender] >= _amount,
      "Desire amount is more than collateral balance"
    );
    //transfer tokens to the user
    IERC20(usdc).transfer(msg.sender, _amount);
    collateral[usdc][msg.sender] = collateral[usdc][msg.sender].sub(_amount);
    emit Withdraw(usdc, msg.sender, _amount, collateral[usdc][msg.sender]);
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
  function getLongUsdAmountOut(uint256 _vBaycAmount) public view returns (uint256) {
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
  function getShortUsdAmountOut(uint256 _vBaycAmount) public view returns (uint256) {
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

  function openLongPosition(uint256 _usdAmount) public {
    //first we run liquidation functions
    liquidateUsers();
    partialLiquidateUsers();

    //calculate the new pool size and user bayc amount
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize + _usdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = vBaycPoolSize - newvBaycPoolSize;
    //update bayc and usd balance of user
    uservBaycBalance[msg.sender] += int256(userBayc);
    uservUsdBalance[msg.sender] -= int256(_usdAmount);
    //update pool
    vBaycPoolSize = newvBaycPoolSize;
    vUsdPoolSize = newvUsdPoolSize;
  }

  function openShortPosition(uint256 _usdAmount) public {
    //first we run liquidation functions
    liquidateUsers();
    partialLiquidateUsers();

    //calculate the new pool size and user bayc amount
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize - _usdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = newvBaycPoolSize - vBaycPoolSize;
    //update bayc and usd balance of user
    uservBaycBalance[msg.sender] -= int256(userBayc);
    uservUsdBalance[msg.sender] += int256(_usdAmount);
    //update pool
    vBaycPoolSize = newvBaycPoolSize;
    vUsdPoolSize = newvUsdPoolSize;
  }

  function _closeLongPostito(address _user, uint256 _assetSize) public {
    require(
      _assetSize <= positive(uservBaycBalance[_user]),
      "You dont have enough asset size to close the position"
    );
    //first we run liquidation functions
    liquidateUsers();
    partialLiquidateUsers();

    //get the output usd of closing position
    //f.e 1Bayc -> 2000$
    uint256 usdBaycValue = getShortUsdAmountOut(_assetSize);
    /*
    1 bayc value = 2000$
    total vBayc balance = 2Bayc
    total vUsd balance = -3000$
    for 1 Bayc -> partialVusdBalance = -3000*1/2 = -1500$

    pnl = 1 bayc balue - partial usd balance = 2000 - positive(-1500) = +500$
    */
    int256 userPartialvUsdBalance = (uservUsdBalance[_user] * int256(_assetSize)) /
      uservBaycBalance[_user];

    //increase or decrease the user pnl for this function
    if (usdBaycValue > uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = usdBaycValue - uint256(positive(userPartialvUsdBalance));
      collateral[usdc][_user] += pnl;
    } else if (usdBaycValue < uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = uint256(positive(userPartialvUsdBalance) - usdBaycValue);
      collateral[usdc][_user] -= pnl;
    }
    //update user balance
    uservBaycBalance[_user] -= int256(_assetSize);
    uservUsdBalance[_user] += userPartialvUsdBalance;

    //update the pool
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    vBaycPoolSize += _assetSize;
    vUsdPoolSize = k / vBaycPoolSize;
  }

  function _closeShortPosition(address _user, uint256 _assetSize) public {
    require(
      _assetSize <= positive(uservBaycBalance[_user]),
      "You dont have enough asset size to close the position"
    );

    //first we run liquidation functions
    liquidateUsers();
    partialLiquidateUsers();
    //get the output usd of closing position
    uint256 usdBaycValue = getLongUsdAmountOut(_assetSize);
    int256 userPartialvUsdBalance = (uservUsdBalance[_user] * int256(_assetSize)) /
      uservBaycBalance[_user];

    /*
    1 bayc value = 2000$
    total vBayc balance = -2Bayc
    total vUsd balance = +3000$
    for 1 Bayc -> partialVusdBalance = 3000*1/2 = 1500$

    pnl =  partial usd balance - 1 bayc value = 1500 - 2000 = -500$
    */

    //increase or decrease pnl of the user
    if (usdBaycValue > uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = usdBaycValue - uint256(positive(userPartialvUsdBalance));
      collateral[usdc][msg.sender] -= pnl;
    }
    if (usdBaycValue < uint256(positive(userPartialvUsdBalance))) {
      uint256 pnl = uint256(positive(userPartialvUsdBalance) - usdBaycValue);
      collateral[usdc][msg.sender] += pnl;
    }
    //update user balance
    uservBaycBalance[msg.sender] += int256(_assetSize);
    uservUsdBalance[msg.sender] -= userPartialvUsdBalance;
    //update pool
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    vBaycPoolSize -= _assetSize;
    vUsdPoolSize = k / vBaycPoolSize;
  }

  function closePosition(uint256 _assetSize) public {
    require(
      _assetSize <= positive(uservBaycBalance[msg.sender]),
      "You dont have enough asset size to close the position"
    );
    //if user has positive vBayc balance so he/she has longPosition
    //if user has negative vBayc balance so he/she has shortPosition
    if (uservBaycBalance[msg.sender] > 0) {
      _closeLongPostito(msg.sender, _assetSize);
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
      uint256 currentBaycValue = getShortUsdAmountOut(uint256(uservBaycBalance[_user]));
      int256 pnl = int256(currentBaycValue) - (-uservUsdBalance[_user]);
      return pnl;
    } else if (uservBaycBalance[_user] < 0) {
      uint256 currentBaycValue = getLongUsdAmountOut(uint256(uservBaycBalance[_user]));
      int256 pnl = uservUsdBalance[_user] - int256(currentBaycValue);
      return pnl;
    }
  }

  function getAccountValue(address _user) public view returns (uint256) {
    uint256 collateralValue = collateral[usdc][msg.sender];
    int256 pnl = getPNL(_user);
    if (pnl < 0) {
      uint256 accountValue = collateralValue - uint256(pnl);
      return accountValue;
    } else {
      uint256 accountValue = collateralValue + uint256(pnl);
      return accountValue;
    }
  }

  function getPositionNotional(address _user) public view returns (uint256) {
    if (uservBaycBalance[_user] > 0) {
      uint256 positionNotionalValue = getShortUsdAmountOut(uint256(uservBaycBalance[_user]));
      return positionNotionalValue;
    } else if (uservBaycBalance[_user] < 0) {
      uint256 positionNotionalValue = getLongUsdAmountOut(positive(uservBaycBalance[_user]));
      return positionNotionalValue;
    } else {
      return 0;
    }
  }

  function userMargin(address _user) public view returns (uint256) {
    uint256 accountValue = getAccountValue(_user);
    uint256 positionNotional = getPositionNotional(_user);
    if (accountValue > 0 && positionNotional > 0) {
      uint256 margin = (100 * accountValue) / positionNotional;
      return margin;
    }
  }

  function isHardLiquidateable(address _user) public view returns (bool) {
    uint256 userMargin = userMargin(_user);
    if (userMargin > 0 && userMargin <= 40) {
      return true;
    } else {
      return false;
    }
  }

  function isPartialLiquidateable(address _user) public view returns (bool) {
    uint256 userMargin = userMargin(_user);
    if (40 <= userMargin && userMargin <= 50) {
      return true;
    } else {
      return false;
    }
  }

  function hardLiquidate(address _user) public {
    require(isHardLiquidateable(_user), "user can not be liquidate");
    if (uservBaycBalance[msg.sender] > 0) {
      _closeLongPostito(_user, uint256(uservBaycBalance[msg.sender]));
    } else if (uservBaycBalance[msg.sender] < 0) {
      _closeShortPosition(_user, positive(uservBaycBalance[msg.sender]));
    }
    uint256 collateralValue = collateral[usdc][msg.sender];
    uint256 discountAmount = (discountRate * collateralValue) / 100;
    collateral[usdc][msg.sender] -= discountAmount;
    insuranceFunds += discountAmount;
  }

  //calculate liquidation amount to turn back the user margin to the save level(60%)
  function calculatePartialLiquidateValue(address _user) public view returns (uint256 x) {
    uint256 totalAccountValue = getAccountValue(_user);
    uint256 totalPositionNotional = getPositionNotional(_user);
    uint256 numerator = (totalPositionNotional * saveLevelMargin) / 100 - totalAccountValue;
    uint256 denominator = saveLevelMargin / 100 - discountRate / 100;
    x = numerator / denominator;
  }

  function partialLiquidate(address _user) public {
    require(isPartialLiquidateable(_user), "user can not be partially liquidated");

    uint256 liquidateAmount = calculatePartialLiquidateValue(_user);
    if (uservBaycBalance[msg.sender] > 0) {
      _closeLongPostito(_user, liquidateAmount);
    } else if (uservBaycBalance[msg.sender] < 0) {
      _closeShortPosition(_user, liquidateAmount);
    }
    uint256 collateralValue = collateral[usdc][msg.sender];
    uint256 discountAmount = (collateralValue * discountRate) / 100;
    collateral[usdc][msg.sender] -= discountAmount;
    insuranceFunds += discountAmount;
  }

  function liquidateUsers() public {
    for (uint256 i = 0; i < activeUsers.length; i++) {
      bool isLiquidateable = isHardLiquidateable(activeUsers[i]);
      if (isLiquidateable == true) {
        hardLiquidate(activeUsers[i]);
      }
    }
  }

  function partialLiquidateUsers() public {
    for (uint256 i = 0; i < activeUsers.length; i++) {
      bool isPartialLiquidateable = isPartialLiquidateable(activeUsers[i]);
      if (isPartialLiquidateable == true) {
        partialLiquidate(activeUsers[i]);
      }
    }
  }

  function requestPrice() public onlyOwner {
    bytes32 requestId = nftOracle.getFloorPrice(specId, payment, assetAddress, pricingAsset);
    latestRequestId = requestId;
  }

  /*
  increasing or decreasing users collateral for add funding rate for each user need loop again(same high gas for thousands of users)
  My suggestion is change the x and y size without change in k.
    x*y = k
    
  Example:
  100 vBayc * 1000vUsd = 100000
  bayc price = 10000/1000 = 10usd
  oracle price = 14 usd
  funding fee = 100*(14-10)/24 =~ 16$
  new usdPool = 1000 + 16 = 1016$
  new baycPool = 10000/1016 =~ 98
  
  98 vBayc * 1016 vUsd = 100000
  sow buy change x and y we give the fund to the long positions and minus it from short positions

  */
  function setFundingRate() public onlyOwner {
    uint256 indexPrice = vBaycPoolSize / vUsdPoolSize;
    uint256 oraclePrice = nftOracle.showPrice(latestRequestId);

    if (indexPrice > oraclePrice) {
      uint256 k = vBaycPoolSize * vUsdPoolSize;
      uint256 fundingFee = (vUsdPoolSize * (indexPrice - oraclePrice)) / 24;
      uint256 newvUsdPoolSize = vUsdPoolSize - fundingFee;
      uint256 newvBaycPoolSize = k / newvUsdPoolSize;

      vUsdPoolSize = newvUsdPoolSize;
      vBaycPoolSize = newvBaycPoolSize;
    } else if (indexPrice < oraclePrice) {
      uint256 k = vBaycPoolSize * vUsdPoolSize;
      uint256 fundingFee = (vUsdPoolSize * (oraclePrice - oraclePrice)) / 24;
      uint256 newvUsdPoolSize = vUsdPoolSize + fundingFee;
      uint256 newvBaycPoolSize = k / newvUsdPoolSize;

      vUsdPoolSize = newvUsdPoolSize;
      vBaycPoolSize = newvBaycPoolSize;
    }
  }
}
