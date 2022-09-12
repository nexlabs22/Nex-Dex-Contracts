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

// @title Nex Exchange smart contract

contract Exchange is Ownable, Pausable, ReentrancyGuard {
  using SafeMath for uint256;

  NftOracle public nftOracle;
  AggregatorV3Interface public priceFeed;

  address public ETHER = address(0);

  uint256 public oracleLatestRoundId; // price oracle (Chainlink)
  uint256 public latestPrice; // price oracle (Chainlink)
  bytes32 public latestRequestId; // latest oracle request id (Chainlink)
  bytes32 public lastRequestId; // last oracle request id (Chainlink)

  bytes32 public specId; //bytes32 jobId
  uint256 public payment; //link amount for call oracle in wei 10000000000000000
  address public assetAddress; //nft address
  string public pricingAsset; // ETH or USD
  uint256 public insuranceFunds;

  uint8 public discountRate = 20; //20%
  uint8 public saveLevelMargin = 60; //60%
  uint8 public maintenanceMargin = 50; //50%
  uint8 public AutoCloseMargin = 40; //40%

  address[] liquidateList;

  struct Position {
    uint256 startTimestamp;
    uint256 price;
    uint256 positionSize;
    address longAddress;
    address shortAddress;
    bool isActive;
  }

  struct LongOrder {
    uint256 price;
    uint256 assetSize;
    address owner;
    bool filled;
  }

  struct ShortOrder {
    uint256 price;
    uint256 assetSize;
    address owner;
    bool filled;
  }

  struct PNL {
    uint256 pnlAmount; //default zero
    bool isPositve; // default false
  }

  Position[] public positions;
  LongOrder[] public longOrders;
  ShortOrder[] public shortOrders;

  mapping(address => PNL) public userPNL; //unrealizedPNL of user
  mapping(address => mapping(address => uint256)) public collateral; //collateral[tokenaddress][useraddress]

  event NewOracle(address oracle);
  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);

  constructor(
    address _nftOracleAddress,
    bytes32 _specId,
    uint256 _payment,
    address _assetAddress,
    string memory _pricingAsset,
    address _priceFeed
  ) {
    nftOracle = NftOracle(_nftOracleAddress);
    bytes32 requestId = nftOracle.getFloorPrice(_specId, _payment, _assetAddress, _pricingAsset);
    latestRequestId = requestId;
    priceFeed = AggregatorV3Interface(_priceFeed);
    specId = _specId;
    payment = _payment;
    assetAddress = _assetAddress;
    pricingAsset = _pricingAsset;
  }

  modifier notContract() {
    require(!_isContract(msg.sender), "Contract not allowed");
    require(msg.sender == tx.origin, "Proxy contract not allowed");
    _;
  }

  //show collateral balance in usd
  function collateralUsdValue(address _user) public view returns (uint256) {
    uint256 ethBalance = collateral[ETHER][_user];
    (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
    return ethBalance.mul(uint256(ethPrice));
  }

  //user usd collateral value + (or -) pnl value
  function totalAccountValue(address _user) public view returns (uint256) {
    uint256 collateralUsdValue = collateralUsdValue(_user);
    PNL memory pnl = userPNL[_user];
    uint256 totalValue;
    if (pnl.isPositve == true) {
      totalValue = collateralUsdValue + pnl.pnlAmount;
    } else {
      totalValue = collateralUsdValue - pnl.pnlAmount;
    }
  }

  //Total of user long and short positions
  function totalPositionNotional(address _user) public view returns (uint256) {
    uint256 latestPrice = nftOracle.showPrice(latestRequestId);
    uint256 totalPositionsvalue = 0;
    for (uint256 i = 0; i < positions.length; i++) {
      if (positions[i].longAddress == _user) {
        totalPositionsvalue += positions[i].positionSize * latestPrice;
      }
      if (positions[i].shortAddress == _user) {
        totalPositionsvalue += positions[i].positionSize * latestPrice;
      }
    }
    return totalPositionsvalue;
  }

  //user margin is between 0 and 100 percent
  function getUserMargin(address _user) public view returns (uint256) {
    uint256 totalAccountValue = totalAccountValue(_user);
    uint256 totalPositionNotional = totalPositionNotional(_user);
    uint256 marginRate = (100 * totalAccountValue) / totalPositionNotional;
    return marginRate;
  }

  //return true if margin rate of user is lower than 40 percent
  function isHardLiquidatable(address _user) public view returns (bool) {
    uint256 userMargin = getUserMargin(_user);
    if (userMargin <= 40) {
      return true;
    } else {
      return false;
    }
  }

  //return true if margin of user is between 40% and 50%
  function isPartialLiquidatable(address _user) public view returns (bool) {
    uint256 userMargin = getUserMargin(_user);
    if (40 <= userMargin && userMargin <= 50) {
      return true;
    } else {
      return false;
    }
  }

  //calculate liquidation amount to turn back the user margin to the save level(60%)
  function calculatePartialLiquidateValue(address _user) public view returns (uint256 x) {
    uint256 totalAccountValue = totalAccountValue(_user);
    uint256 totalPositionNotional = totalPositionNotional(_user);
    uint256 numerator = (saveLevelMargin * totalPositionNotional) / 100 - totalAccountValue;
    uint256 denominator = (saveLevelMargin - discountRate) / 100;
    x = numerator / denominator;
  }

  //deposit collateral
  function depositEther() public payable {
    collateral[ETHER][msg.sender] = collateral[ETHER][msg.sender].add(msg.value);
    emit Deposit(ETHER, msg.sender, msg.value, collateral[ETHER][msg.sender]);
  }

  //withdraw collateral
  function withdrawEther(uint256 _amount) public {
    require(
      collateral[ETHER][msg.sender] >= _amount,
      "Desire amount is more than collateral balance"
    );
    collateral[ETHER][msg.sender] = collateral[ETHER][msg.sender].sub(_amount);
    payable(msg.sender).transfer(_amount);
    emit Withdraw(ETHER, msg.sender, _amount, collateral[ETHER][msg.sender]);
  }

  //increase collateral when positive pnl is realized
  function _increaseCollateral(address _user, uint256 _usdValue) public {
    (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
    uint256 etherValue = _usdValue * uint256(ethPrice);
    collateral[ETHER][_user] += etherValue;
  }

  //increase collateral when negative pnl is realized
  function _decreaseCollateral(address _user, uint256 _usdValue) public {
    (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
    uint256 etherValue = _usdValue * uint256(ethPrice);
    collateral[ETHER][_user] -= etherValue;
  }

  //put order by usd value
  function openLongOrderUsd(
    address _user,
    uint256 _usdAmount,
    uint256 _price
  ) public {
    uint256 latestPrice = nftOracle.showPrice(latestRequestId);
    uint256 assetSize = _usdAmount / latestPrice;
    openLongOrder(_user, assetSize, _price);
  }

  //put order by by asset amount (for example 1 ape nft)
  function openLongOrder(
    address _user,
    uint256 _assetSize,
    uint256 _price
  ) public {
    longOrders.push(LongOrder(_price, _assetSize, _user, false));

    for (uint256 i = 0; i < shortOrders.length; i++) {
      if (shortOrders[i].assetSize >= _assetSize && shortOrders[i].price == _price) {
        positions.push(
          Position(block.timestamp, _price, _assetSize, _user, shortOrders[i].owner, true)
        );
        shortOrders[i].assetSize -= _assetSize;
        if (shortOrders[i].assetSize == 0) {
          delete shortOrders[i];
        }
        delete longOrders[longOrders.length - 1];
        return;
      }
    }
  }

  //put order by usd value
  function openShortOrderUsd(
    address _user,
    uint256 _usdAmount,
    uint256 _price
  ) public {
    uint256 latestPrice = nftOracle.showPrice(latestRequestId);
    uint256 assetSize = _usdAmount / latestPrice;
    openShortOrder(_user, assetSize, _price);
  }

  //put order by by asset amount (for example 1 ape nft
  function openShortOrder(
    address _user,
    uint256 _assetSize,
    uint256 _price
  ) public {
    shortOrders.push(ShortOrder(_price, _assetSize, _user, false));

    for (uint256 i = 0; i <= longOrders.length; i++) {
      if (longOrders[i].assetSize >= _assetSize && longOrders[i].price == _price) {
        positions.push(
          Position(block.timestamp, _price, _assetSize, longOrders[i].owner, _user, true)
        );
        longOrders[i].assetSize -= _assetSize;
        if (longOrders[i].assetSize == 0) {
          delete longOrders[i];
        }
        delete shortOrders[shortOrders.length - 1];
        return;
      }
    }
  }

  //close the order by current orders
  function _closeLongPositionMarket(
    address _user,
    uint256 _assetSize,
    uint256 _positionId
  ) public {
    uint256 assetSize = positions[_positionId].positionSize;
    address longAddress = positions[_positionId].longAddress;
    uint256 positionPrice = positions[_positionId].price;
    require(
      assetSize >= _assetSize,
      "asset size of positoin is not equal to your desire assetSize"
    );
    require(longAddress == _user, "user is not the longAddress address of this position");
    for (uint256 i = 0; i <= longOrders.length; i++) {
      if (longOrders[i].assetSize >= _assetSize && longOrders[i].price == positionPrice) {
        positions[_positionId].longAddress = longOrders[i].owner;
        longOrders[i].assetSize -= _assetSize;
        if (longOrders[i].assetSize == 0) {
          delete longOrders[i];
        }
        return;
      }
    }
  }

  //close the order by current orders
  function _closeShortPositionMarket(
    address _user,
    uint256 _assetSize,
    uint256 _positionId
  ) public {
    uint256 assetSize = positions[_positionId].positionSize;
    address shortAddress = positions[_positionId].shortAddress;
    uint256 positionPrice = positions[_positionId].price;
    require(
      assetSize >= _assetSize,
      "asset size of positoin is not equal to your desire assetSize"
    );
    require(shortAddress == _user, "user is not the short address of this position");
    for (uint256 i = 0; i <= shortOrders.length; i++) {
      if (shortOrders[i].assetSize >= _assetSize && shortOrders[i].price == positionPrice) {
        positions[_positionId].shortAddress = shortOrders[i].owner;
        shortOrders[i].assetSize -= _assetSize;
        if (shortOrders[i].assetSize == 0) {
          delete shortOrders[i];
        }
        return;
      }
    }
  }

  //this function should be done in adjustPositions function
  function _increasePNL(address _user, uint256 _amount) public {
    PNL memory pnl = userPNL[_user];
    if (pnl.isPositve == true || pnl.pnlAmount == 0) {
      userPNL[_user].pnlAmount += _amount;
    }
    if (pnl.isPositve == false && pnl.pnlAmount > _amount) {
      userPNL[_user].pnlAmount -= _amount;
    }
    if (pnl.isPositve == false && pnl.pnlAmount <= _amount) {
      userPNL[_user].pnlAmount = (_amount - pnl.pnlAmount);
      pnl.isPositve = true;
    }
  }

  //this function should be done in adjustPositions function
  function _decreasePNL(address _user, uint256 _amount) public {
    PNL memory pnl = userPNL[_user];
    if (pnl.isPositve == false) {
      userPNL[_user].pnlAmount += _amount;
    }
    if (pnl.isPositve == true && pnl.pnlAmount > _amount) {
      userPNL[_user].pnlAmount -= _amount;
    }
    if (pnl.isPositve == true && pnl.pnlAmount <= _amount) {
      userPNL[_user].pnlAmount = (_amount - pnl.pnlAmount);
      pnl.isPositve = false;
    }
  }

  //realized pnl : when pnl is positve we increase the collateral
  //realized pnl : when pnl is negative we decrease the collateral
  function _realizePNL(address _user, uint256 _amount) public {
    PNL memory pnl = userPNL[_user];
    require(_amount <= userPNL[_user].pnlAmount, "the amount is greater that pnlAmount");
    if (pnl.isPositve == false) {
      userPNL[_user].pnlAmount -= _amount;
      _decreaseCollateral(_user, _amount);
    }
    if (pnl.isPositve == true) {
      userPNL[_user].pnlAmount -= _amount;
      _increaseCollateral(_user, _amount);
      if (userPNL[_user].pnlAmount == 0) {
        pnl.isPositve = false;
      }
    }
  }

  //calculate the index price of the asset
  function getIndexPrice() public view returns (uint256) {
    uint256 highestLongOrderPrice = longOrders[longOrders.length - 1].price;
    uint256 lowestShortPrice = shortOrders[shortOrders.length - 1].price;
    for (uint256 i; i < longOrders.length; i++) {
      if (longOrders[i].price > highestLongOrderPrice) {
        highestLongOrderPrice = longOrders[i].price;
      }
    }
    for (uint256 i; i < shortOrders.length; i++) {
      if (shortOrders[i].price < lowestShortPrice) {
        lowestShortPrice = shortOrders[i].price;
      }
    }

    uint256 indexPrice = 0;
    if (lowestShortPrice < highestLongOrderPrice) {
      indexPrice = (highestLongOrderPrice - lowestShortPrice) / 2;
    }
    if (lowestShortPrice > highestLongOrderPrice) {
      indexPrice = (lowestShortPrice - highestLongOrderPrice) / 2;
    }
    return indexPrice;
  }

  //adjust the funding rate for the long and short postions
  function _getFundingRate(uint256 indexPrice, uint256 oraclePrice) public {
    for (uint256 i = 0; i < positions.length; i++) {
      uint256 assetSize = positions[i].positionSize;
      address longAddress = positions[i].longAddress;
      address shortAddress = positions[i].shortAddress;
      if (indexPrice > oraclePrice) {
        uint256 fundingFee = assetSize * (indexPrice - oraclePrice);
        _increasePNL(shortAddress, fundingFee);
        _decreasePNL(longAddress, fundingFee);
      }
      if (indexPrice < oraclePrice) {
        uint256 fundingFee = assetSize * (indexPrice - oraclePrice);
        _increasePNL(longAddress, fundingFee);
        _decreasePNL(shortAddress, fundingFee);
      }
    }
  }

  //add user to the liquidate list
  function _addToLiquidateList(address _user) public {
    bool isExist;
    for (uint256 i; i < liquidateList.length; i++) {
      if (liquidateList[i] == _user) {
        isExist = true;
        return;
      }
    }
    if (isExist == false) {
      liquidateList.push(_user);
    }
  }

  //liquidate part of user position to turn it back to the save level
  function _partialLiquidation(address _user) public {
    uint256 liquidateAmount = calculatePartialLiquidateValue(_user);
    uint256 realizeAmout = (liquidateAmount * discountRate) / 100;
    _realizePNL(_user, realizeAmout);
    for (uint256 i = 0; i < positions.length; i++) {
      if (positions[i].longAddress == _user && positions[i].positionSize >= liquidateAmount) {
        _closeLongPositionMarket(_user, liquidateAmount, i);
        return;
      } else if (
        positions[i].shortAddress == _user && positions[i].positionSize >= liquidateAmount
      ) {
        _closeShortPositionMarket(_user, liquidateAmount, i);
        return;
      }
    }
  }

  //hard liquidate(aouto liquidate) happen when user margen fall below 0.4
  function _hardLiquidate(address _user) public onlyOwner {
    bool liquidatable = isHardLiquidatable(_user);
    require(liquidatable == true, "user can not be liquidated");
    for (uint256 i = 0; i < positions.length; i++) {
      if (positions[i].longAddress == _user) {
        uint256 positoinSize = positions[i].positionSize;
        _closeLongPositionMarket(_user, positoinSize, i);
      }
      if (positions[i].shortAddress == _user) {
        uint256 positoinSize = positions[i].positionSize;
        _closeShortPositionMarket(_user, positoinSize, i);
      }
    }

    if (userPNL[_user].isPositve == true) {
      _increaseCollateral(_user, userPNL[_user].pnlAmount);
      userPNL[_user].pnlAmount = 0;
    } else {
      _decreaseCollateral(_user, userPNL[_user].pnlAmount);
      userPNL[_user].pnlAmount = 0;
    }

    uint256 collateralValue = collateralUsdValue(_user);
    uint256 discountAmount = (discountRate * collateralValue) / 100;
    _decreaseCollateral(_user, discountAmount);
    insuranceFunds;
  }

  function executePartialLiquidation() public onlyOwner {
    for (uint256 i; i < liquidateList.length; i++) {
      _partialLiquidation(liquidateList[i]);
      delete liquidateList[i];
    }
  }

  //calculate profit or lost for users pnl
  function adjustPositions() public onlyOwner {
    uint256 newPrice;
    uint256 oldPrice;
    uint256 newOraclePrice = nftOracle.showPrice(latestRequestId);
    uint256 oldOraclePrice = nftOracle.showPrice(lastRequestId);
    uint256 indexPrice = getIndexPrice();
    _getFundingRate(indexPrice, newOraclePrice);

    if ((indexPrice * 100) / newOraclePrice <= 120 && (indexPrice * 100) / newOraclePrice >= 80) {
      newPrice = indexPrice;
      oldPrice = oldOraclePrice;
    } else {
      newPrice = newOraclePrice;
      oldPrice = oldOraclePrice;
    }

    for (uint256 i = 0; i < positions.length; i++) {
      uint256 assetSize = positions[i].positionSize;
      address longAddress = positions[i].longAddress;
      address shortAddress = positions[i].shortAddress;
      if (newPrice > oldPrice) {
        uint256 reward = assetSize * (newPrice - oldPrice);
        _increasePNL(longAddress, reward);
        _decreasePNL(shortAddress, reward);
        bool isHardLiquidatable = isHardLiquidatable(shortAddress);
        bool isPartialLiquidatable = isPartialLiquidatable(shortAddress);
        if (isHardLiquidatable == true) {
          _hardLiquidate(shortAddress);
        }
        if (isPartialLiquidatable == true) {
          _addToLiquidateList(shortAddress);
        }
      }
      if (newPrice < oldPrice) {
        uint256 reward = assetSize * (newPrice - oldPrice);
        _increasePNL(shortAddress, reward);
        _decreasePNL(longAddress, reward);
        bool isHardLiquidatable = isHardLiquidatable(longAddress);
        bool isPartialLiquidatable = isPartialLiquidatable(shortAddress);
        if (isHardLiquidatable == true) {
          _hardLiquidate(longAddress);
        }
        if (isPartialLiquidatable == true) {
          _addToLiquidateList(longAddress);
        }
      }
    }
  }

  //request price from the oracle and save the requrest id
  //should be called befor adjust collateral
  //It should be called every 24 hour
  function requestPrice() public onlyOwner {
    bytes32 requestId = nftOracle.getFloorPrice(specId, payment, assetAddress, pricingAsset);
    if (requestId != latestRequestId) {
      lastRequestId = latestRequestId;
      latestRequestId = requestId;
    }
  }

  function _isContract(address account) internal view returns (bool) {
    uint256 size;
    assembly {
      size := extcodesize(account)
    }
    return size > 0;
  }
}
