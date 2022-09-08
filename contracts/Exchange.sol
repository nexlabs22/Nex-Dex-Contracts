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
    uint256 pnlAmount;//default zero
    bool isPositve; // default false
  }

  Position[] public positions;
  LongOrder[] public longOrders;
  ShortOrder[] public shortOrders;



  mapping(address => PNL) public userPNL;
  mapping(address => mapping(address => uint256)) public collateral; //collateral[tokenaddress][useraddress]
  mapping(address => uint) public insuranceFund;


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
    uint collateralUsdValue = collateralUsdValue(_user);
    PNL memory pnl = userPNL[_user];
    uint totalValue;
    if(pnl.isPositve == true){
      totalValue = collateralUsdValue + pnl.pnlAmount;
    }else{
      totalValue = collateralUsdValue - pnl.pnlAmount;
    }
  }

  //Total of user long and short positions
  function totalPositionNotional(address _user) public view returns (uint256) {
    uint256 latestPrice = nftOracle.showPrice(latestRequestId);
    uint totalPositionsvalue;
    for(uint i=0; i < positions.length; i++){
      if(positions[i].longAddress == _user || positions[i].shortAddress == _user){
        totalPositionsvalue += positions[i].positionSize*latestPrice;
      }
      return totalPositionsvalue;
    }
  }

  //user margin is between 0 and 100 percent
  function getUserMargin(address _user) public view returns(uint){
    uint totalAccountValue = totalAccountValue(_user);
    uint totalPositionNotional = totalPositionNotional(_user);
    uint marginRate = 100*totalAccountValue/totalPositionNotional;
    return marginRate;
  }

  //return true if margin rate of user is lower than 40 percent
  function isHardLiquidatable(address _user) public view returns(bool) {
    uint userMargin = getUserMargin(_user);
    if(userMargin <= 40){
      return true;
    }else{
      return false;
    }
  }


  //deposit collateral
  function depositEther() public payable {
    collateral[ETHER][msg.sender] = collateral[ETHER][msg.sender].add(msg.value);
    emit Deposit(ETHER, msg.sender, msg.value, collateral[ETHER][msg.sender]);
  }

//this function requires the inclusion that you cannot withdraw collateral if you are below the 0.6 margin lvl, otherwize you force yourself into liquidation.

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

  
  //put order by usd value
  function openLongOrderUsd(uint _usdAmount, uint _price) public {
    uint256 latestPrice = nftOracle.showPrice(latestRequestId);
    uint assetSize = _usdAmount/latestPrice;
    openLongOrder(assetSize, _price);
  }

  //put order by by asset amount (for example 1 ape nft)
  function openLongOrder(uint _assetSize, uint _price) public {
    longOrders.push(LongOrder(
      _price,
      _assetSize,
      msg.sender,
      false
    ));

    for (uint256 i = 0; i < shortOrders.length; i++) {
      if(shortOrders[i].assetSize == _assetSize &&
        shortOrders[i].price == _price &&
        shortOrders[i].filled == false
        ){
          positions.push(Position(
            block.timestamp,
            _price,
            _assetSize,
            msg.sender,
            shortOrders[i].owner,
            true
          ));
        delete shortOrders[i];
        delete longOrders[longOrders.length - 1];
        return;
        }
    }
  }

  //put order by usd value
  function openShortOrderUsd(uint _usdAmount, uint _price) public {
    uint256 latestPrice = nftOracle.showPrice(latestRequestId);
    uint assetSize = _usdAmount/latestPrice;
    openShortOrder(assetSize, _price);
  }

  //put order by by asset amount (for example 1 ape nft
  function openShortOrder(uint _assetSize, uint _price) public {

    shortOrders.push(ShortOrder(
      _price,
      _assetSize,
      msg.sender,
      false
    ));


    for (uint256 i = 0; i <= longOrders.length; i++) {
      if(longOrders[i].assetSize == _assetSize &&
        longOrders[i].price == _price &&
        longOrders[i].filled == false
        ){

          positions.push(Position(
            block.timestamp,
            _price,
            _assetSize,
            longOrders[i].owner,
            msg.sender,
            true
          ));

        delete longOrders[i];
        delete shortOrders[shortOrders.length - 1];
        return;
        }
    }
  }
  
  //Instead of keeping track of the pnl function in the memory, I think it is easier to keep track of position notional and the totalpositionamount[#], because
  // the PNL is a resultant of these variables.
  // Then everytime the smartcontract is invoked, the pnl is calculated based on the current oracle price and the weighted average purchase/open price
  // Formula something like this: 
  
  // totalPositionAmount[#] += tradeAmount
  // Position notional = totalPositionAmount * oraclePrice
  
  // (weighted average): Openprice = Position notional/abs(totalPositionamount) (assuming the amount is negative for short)
  // PNL = (oracleprice - openPrice) * totalPositionAmount 
  
  
  //this function should be done in adjustPositions function
  function _increasePNL(address _user, uint _amount) public {
    PNL memory pnl = userPNL[_user];
    if(pnl.isPositve == true || pnl.pnlAmount ==0){
      userPNL[_user].pnlAmount += _amount;
    }
    if(pnl.isPositve == false && pnl.pnlAmount > _amount){
      userPNL[_user].pnlAmount -= _amount;
    }
    if(pnl.isPositve == false && pnl.pnlAmount <= _amount){
      userPNL[_user].pnlAmount = (_amount - pnl.pnlAmount);
      pnl.isPositve = true;
    }
  }

  //this function should be done in adjustPositions function
  function _decreasePNL(address _user, uint _amount) public {
    PNL memory pnl = userPNL[_user];
    if(pnl.isPositve == false){
      userPNL[_user].pnlAmount += _amount;
    }
    if(pnl.isPositve == true && pnl.pnlAmount > _amount){
      userPNL[_user].pnlAmount -= _amount;
    }
    if(pnl.isPositve == true && pnl.pnlAmount <= _amount){
      userPNL[_user].pnlAmount = (_amount - pnl.pnlAmount);
      pnl.isPositve = false;
    }
  }

  //calculate the index price of the asset
  function getIndexPrice() public view returns(uint256){
    uint highestLongOrderPrice = longOrders[longOrders.length - 1].price;
    uint lowestShortPrice= shortOrders[shortOrders.length - 1].price;
    for(uint i; i < longOrders.length; i++){
      if(longOrders[i].price > highestLongOrderPrice){
        highestLongOrderPrice = longOrders[i].price;
      }
    }
    for(uint i; i < shortOrders.length; i++){
      if(shortOrders[i].price < lowestShortPrice){
        lowestShortPrice = shortOrders[i].price;
      }
    }

     uint indexPrice;
    if(lowestShortPrice < highestLongOrderPrice){
    indexPrice = (highestLongOrderPrice - lowestShortPrice)/2;
    }
    if(lowestShortPrice > highestLongOrderPrice){
    indexPrice = (lowestShortPrice - highestLongOrderPrice)/2;
    }
    return indexPrice;
  }

  //calculate profit or loss for users pnl
  function adjustPositions() public onlyOwner {
    uint256 newPrice;
    uint256 oldPrice;
    uint256 newOraclePrice = nftOracle.showPrice(latestRequestId);
    uint256 oldOraclePrice = nftOracle.showPrice(lastRequestId);
    uint256 indexPrice = getIndexPrice();

    if(indexPrice*100/newOraclePrice <= 120 && indexPrice*100/newOraclePrice >= 80){
      newPrice = indexPrice;
      oldPrice = oldOraclePrice;
    }else{
      newPrice = newOraclePrice;
      oldPrice = oldOraclePrice;
    }

    for (uint256 i = 0; i < positions.length; i++) {
      uint assetSize = positions[i].positionSize;
      address longAddress = positions[i].longAddress;
      address shortAddress = positions[i].shortAddress;
      if(newPrice > oldPrice){
        uint reward = assetSize*(newPrice - oldPrice);
        _increasePNL(longAddress, reward);
        _decreasePNL(shortAddress, reward);
      }
      if(newPrice < oldPrice){
        uint reward = assetSize*(newPrice - oldPrice);
        _increasePNL(shortAddress, reward);
        _decreasePNL(longAddress, reward);
      }
    }
    

  }


  

  //request price from the oracle and save the request id
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
