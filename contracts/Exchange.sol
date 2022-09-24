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
    uint256 longStartPrice;
    uint256 shortStartPrice;
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


  Position[] public positions;
  LongOrder[] public longOrders;
  ShortOrder[] public shortOrders;

  mapping(address => mapping(address => uint256)) public collateral; //collateral[tokenaddress][useraddress]

  mapping(address => uint256) public totalInvestedValue; // sum of (assetSize*filledOrderPrice) of each user;
  mapping(address => uint256) public totalAssetSize; //sum of assetSize of each user

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


  function ethPrice() public view returns (uint256) {
    (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
    uint8 quoteDecimals = priceFeed.decimals();
    // return quoteDecimals;
    return uint256(ethPrice * int256(10**uint256(18 - quoteDecimals)));
  }


  //show collateral balance in usd
  function collateralUsdValue(address _user) public view returns (uint256) {
    uint256 ethBalance = collateral[ETHER][_user];
    uint256 ethPrice = ethPrice();
    return ethBalance.mul(ethPrice).div(1e18);
  }

  //totalAccountValue =  collateralUsdValue +(-) unrealizedPNL
  function totalAccountValue(address _user) public view returns (uint256) {
    uint256 totalAccountValue;
    uint256 collateralUsdValue = collateralUsdValue(_user);
    uint totalInvestedValue = totalInvestedValue[_user];
    uint totalPositionNotional = totalPositionNotional(_user);

    //calculate pnl = totalPositionNotional - totalInvestedValue
    if (totalPositionNotional > totalInvestedValue) {
      uint256 unrealizedPNL = totalPositionNotional - collateralUsdValue;
      totalAccountValue = collateralUsdValue + unrealizedPNL;
    }
    if (totalPositionNotional < totalInvestedValue) {
      uint256 unrealizedPNL = totalInvestedValue - totalPositionNotional;
      totalAccountValue = collateralUsdValue - unrealizedPNL;
    }

    return totalAccountValue;
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
  // margin = totalAccountValue/totalPositionNotional
  function getUserMargin(address _user) public view returns (uint256) {
    uint256 totalAccountValue = totalAccountValue(_user);
    uint256 totalPositionNotional = totalPositionNotional(_user);
    uint256 marginRate;
    if (totalAccountValue > 0 && totalPositionNotional > 0) {
      marginRate = 100 * totalAccountValue/ totalPositionNotional;
    }
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
    uint256 numerator = (totalPositionNotional * saveLevelMargin) / 100 - totalAccountValue;
    uint256 denominator = saveLevelMargin / 100 - discountRate / 100;
    x = numerator / denominator;
  }

  //deposit collateral
  function depositEther() public payable {
    collateral[ETHER][msg.sender] = collateral[ETHER][msg.sender].add(msg.value);
    emit Deposit(ETHER, msg.sender, msg.value, collateral[ETHER][msg.sender]);
  }

  //withdraw collateral
  function withdrawEther(uint256 _amount) public {
    uint256 ethPrice = ethPrice();
    uint usdAmount = _amount*ethPrice/1e18;

    uint256 userMargin = getUserMargin(msg.sender);
    uint256 totalPositionNotional = totalPositionNotional(msg.sender);
    uint256 totalAccountValue = totalAccountValue(msg.sender);
    if(totalPositionNotional > 0){
    uint newAccountValue = totalAccountValue - usdAmount;
    uint newMargin = 100*newAccountValue/totalPositionNotional;
    require(
      newMargin > 60,
      "You cannot withdraw because your margin rate is the lower than saveMargin level"
    );
    }
    require(
      collateral[ETHER][msg.sender] >= _amount,
      "Desire amount is more than collateral balance"
    );
    collateral[ETHER][msg.sender] = collateral[ETHER][msg.sender].sub(_amount);
    payable(msg.sender).transfer(_amount);
    emit Withdraw(ETHER, msg.sender, _amount, collateral[ETHER][msg.sender]);
  }

  //increase collateral when positive pnl is realized
  function _increaseCollateral(address _user, uint256 _usdValue) internal {
    (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
    uint256 etherValue = _usdValue * uint256(ethPrice);
    collateral[ETHER][_user] += etherValue;
  }

  //increase collateral when negative pnl is realized
  function _decreaseCollateral(address _user, uint256 _usdValue) internal {
    (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
    uint256 etherValue = _usdValue * uint256(ethPrice);
    collateral[ETHER][_user] -= etherValue;
  }

  //get free collateral amount that user can withdraw
  function _getFreeCollateral(address _user) public view returns (uint256) {
    uint256 totalAccountValue = totalAccountValue(_user);
    uint256 totalPositionNotional = totalPositionNotional(_user);
    uint256 requireMarginAmount = (totalPositionNotional * maintenanceMargin) / 100;
    uint256 freeCollateral = totalAccountValue - requireMarginAmount;
    return freeCollateral;
  }

  //averagePrice = totalInvestedValue/assetSize
  function getAverageEntryPrice(address _user) public view returns (uint256) {
    uint256 totalInvestedValue = totalInvestedValue[_user];
    uint256 totalAssetSize = totalAssetSize[_user];
    if (totalAssetSize > 0 && totalInvestedValue > 0) {
      return totalInvestedValue / totalAssetSize;
    }
  }

  function allLongOrders() public view returns (LongOrder[] memory) {
    return longOrders;
  }

  function allShortOrders() public view returns (ShortOrder[] memory) {
    return shortOrders;
  }

  function allPositions() public view returns (Position[] memory) {
    return positions;
  }

  //put long order by usd value
  //convert usd value to the asset size according to the asset price (assetSize = _usdAmount/oraclePrice)
  //if the short order with the same price exist the position will be created
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
  //if a short order with the same price exist the position will be created
  function openLongOrder(
    address _user,
    uint256 _assetSize,
    uint256 _price
  ) public {
    longOrders.push(LongOrder(_price, _assetSize, _user, false));

    for (uint256 i = 0; i < shortOrders.length; i++) {
      if (shortOrders[i].assetSize >= _assetSize && shortOrders[i].price == _price) {
        positions.push(
          Position(
            block.timestamp,//position start time 
            _price,// position price
            _price,//long start price
            _price,//short start price
            _assetSize,//assetSize
            _user,//longAddress
            shortOrders[i].owner,//shortAddress
            true//is acitve
          )
        );
        shortOrders[i].assetSize -= _assetSize;
        totalInvestedValue[shortOrders[i].owner] += _assetSize * _price;
        totalAssetSize[shortOrders[i].owner] += _assetSize;
        if (shortOrders[i].assetSize == 0) {
          delete shortOrders[i];
        }
        totalInvestedValue[longOrders[longOrders.length - 1].owner] += _assetSize * _price;
        totalAssetSize[longOrders[longOrders.length - 1].owner] += _assetSize;
        delete longOrders[longOrders.length - 1];
        return;
      }
    }
  }

  //cancel the long order
  function cancelLongOrder(uint _longOrderId) public {
    require(longOrders[_longOrderId].owner == msg.sender, "Your order id is not true");
    delete longOrders[_longOrderId];
  }

  //put long order by usd value
  //convert usd value to the asset size according to the asset price (assetSize = _usdAmount/oraclePrice)
  //if the long order with the same price exist the position will be created
  function openShortOrderUsd(
    address _user,
    uint256 _usdAmount,
    uint256 _price
  ) public {
    uint256 latestPrice = nftOracle.showPrice(latestRequestId);
    uint256 assetSize = _usdAmount / latestPrice;
    openShortOrder(_user, assetSize, _price);
  }

  //put order by by asset amount (for example 1 ape nft)
  //if the long order with the same price exist the position will be created
  function openShortOrder(
    address _user,
    uint256 _assetSize,
    uint256 _price
  ) public {
    shortOrders.push(ShortOrder(_price, _assetSize, _user, false));

    for (uint256 i = 0; i < longOrders.length; i++) {
      if (longOrders[i].assetSize >= _assetSize && longOrders[i].price == _price) {
        positions.push(
          Position(
            block.timestamp,
            _price,
            _price,
            _price,
            _assetSize,
            longOrders[i].owner,
            _user,
            true
          )
        );
        longOrders[i].assetSize -= _assetSize;
        totalInvestedValue[longOrders[i].owner] += _assetSize * _price;
        totalAssetSize[longOrders[i].owner] += _assetSize;
        if (longOrders[i].assetSize == 0) {
          delete longOrders[i];
        }
        totalInvestedValue[shortOrders[shortOrders.length - 1].owner] += _assetSize * _price;
        totalAssetSize[shortOrders[shortOrders.length - 1].owner] += _assetSize;
        delete shortOrders[shortOrders.length - 1];
        break;
      }
    }
  }

  //cancel short order
  function cancelShortOrder(uint _shortOrderId) public {
    require(shortOrders[_shortOrderId].owner == msg.sender, "Your order id is not true");
    delete shortOrders[_shortOrderId];
  }

  //close the position by current orders
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
      "asset size of position is not equal to your desire assetSize"
    );
    require(longAddress == _user, "user is not the longAddress address of this position");
    for (uint256 i = 0; i <= longOrders.length; i++) {
      if (longOrders[i].assetSize >= _assetSize && longOrders[i].price == positionPrice) {
        totalAssetSize[_user] -= _assetSize;
        totalInvestedValue[_user] -= _assetSize * positions[_positionId].longStartPrice;
        _realizePNL(_user, positions[_positionId].longStartPrice, longOrders[i].price, _assetSize);

        positions[_positionId].longAddress = longOrders[i].owner;
        positions[_positionId].longStartPrice = longOrders[i].price;
        totalInvestedValue[longOrders[i].owner] += longOrders[i].price * _assetSize;
        totalAssetSize[longOrders[i].owner] += _assetSize;
        longOrders[i].assetSize -= _assetSize;
        if (longOrders[i].assetSize == 0) {
          delete longOrders[i];
        }
        return;
      }
    }
  }

  //close the position by current orders
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
      "asset size of position is not equal to your desire assetSize"
    );
    require(shortAddress == _user, "user is not the short address of this position");
    for (uint256 i = 0; i <= shortOrders.length; i++) {
      if (shortOrders[i].assetSize >= _assetSize && shortOrders[i].price == positionPrice) {

        totalAssetSize[_user] -= _assetSize;
        totalInvestedValue[_user] -= _assetSize * positions[_positionId].shortStartPrice;
        _realizePNL(_user, positions[_positionId].shortStartPrice, shortOrders[i].price, _assetSize);

        positions[_positionId].shortAddress = shortOrders[i].owner;
        positions[_positionId].shortStartPrice = shortOrders[i].price;
        totalInvestedValue[shortOrders[i].owner] += shortOrders[i].price * _assetSize;
        totalAssetSize[shortOrders[i].owner] += _assetSize;
        shortOrders[i].assetSize -= _assetSize;
        totalAssetSize[_user] -= _assetSize;
        if (shortOrders[i].assetSize == 0) {
          delete shortOrders[i];
        }
        return;
      }
    }
  }

  //this function should be done in adjustPositions function
  //we use this function only in close position for realize the reward of user
  function _realizePNL(
    address _user,
    uint256 _startPrice,
    uint256 _currentPrice,
    uint256 _assetSize
  ) public {
    uint256 usdReward;
    if (_startPrice < _currentPrice) {
      usdReward = (_currentPrice - _startPrice) * _assetSize;
      _increaseCollateral(_user, usdReward);
    }
    if (_currentPrice < _startPrice) {
      usdReward = (_startPrice - _currentPrice) * _assetSize;
      _decreaseCollateral(_user, usdReward);
    }
  }

  //calculate the index price of the asset
  function getIndexPrice() public view returns (uint256) {
    uint256 highestLongOrderPrice = longOrders[longOrders.length - 1].price;
    uint256 lowestShortOrderPrice = shortOrders[shortOrders.length - 1].price;
    for (uint256 i; i < longOrders.length; i++) {
      if (longOrders[i].price > highestLongOrderPrice) {
        highestLongOrderPrice = longOrders[i].price;
      }
    }
    for (uint256 i; i < shortOrders.length; i++) {
      if (shortOrders[i].price < lowestShortOrderPrice) {
        lowestShortOrderPrice = shortOrders[i].price;
      }
    }

    uint256 indexPrice = 0;
    indexPrice = (highestLongOrderPrice + lowestShortOrderPrice) / 2;
    return indexPrice;
  }

  //adjust the funding rate for the long and short postions
  function _getFundingRate(uint256 indexPrice, uint256 oraclePrice) public {
    for (uint256 i = 0; i < positions.length; i++) {
      uint256 assetSize = positions[i].positionSize;
      address longAddress = positions[i].longAddress;
      address shortAddress = positions[i].shortAddress;
      if (indexPrice > oraclePrice) {
        uint256 fundingFee = assetSize * (indexPrice - oraclePrice)/24;
        _increaseCollateral(shortAddress, fundingFee);
        _decreaseCollateral(longAddress, fundingFee);
      }
      if (indexPrice < oraclePrice) {
        uint256 fundingFee = assetSize * (indexPrice - oraclePrice)/24;
        _increaseCollateral(longAddress, fundingFee);
        _decreaseCollateral(shortAddress, fundingFee);
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
    uint256 discountAmount = liquidateAmount*discountRate/100;
    for (uint256 i = 0; i < positions.length; i++) {
      if (positions[i].longAddress == _user && positions[i].positionSize >= liquidateAmount) {
        _closeLongPositionMarket(_user, liquidateAmount, i);
        _decreaseCollateral(_user, discountAmount);
        insuranceFunds += discountAmount;
        return;
      } else if (
        positions[i].shortAddress == _user && positions[i].positionSize >= liquidateAmount
      ) {
        _closeShortPositionMarket(_user, liquidateAmount, i);
        _decreaseCollateral(_user, discountAmount);
        insuranceFunds += discountAmount;
        return;
      }
    }
  }

  //hard liquidate(auto liquidate) happen when user margen fall below 0.4
  function _hardLiquidate(address _user) public onlyOwner {
    bool liquidatable = isHardLiquidatable(_user);
    require(liquidatable == true, "user cannot be liquidated");
    for (uint256 i = 0; i < positions.length; i++) {
      if (positions[i].longAddress == _user) {
        uint256 positionSize = positions[i].positionSize;
        _closeLongPositionMarket(_user, positionSize, i);
      }
      if (positions[i].shortAddress == _user) {
        uint256 positionSize = positions[i].positionSize;
        _closeShortPositionMarket(_user, positionSize, i);
      }
    }
    uint256 collateralValue = collateralUsdValue(_user);
    uint256 discountAmount = discountRate*collateralValue/100;
    _decreaseCollateral(_user, discountAmount);
    insuranceFunds += discountAmount;
  }

  function executePartialLiquidation() public onlyOwner {
    for (uint256 i; i < liquidateList.length; i++) {
      _partialLiquidation(liquidateList[i]);
      delete liquidateList[i];
    }
  }

  //calculate profit or loss for users pnl
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
      address longAddress = positions[i].longAddress;
      address shortAddress = positions[i].shortAddress;
      if (newPrice > oldPrice) {
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
  //It should be called every hour
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
