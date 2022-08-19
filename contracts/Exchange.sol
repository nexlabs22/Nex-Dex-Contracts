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

  address public adminAddress; // address of the admin
  address public operatorAddress; // address of the operator
  address public ETHER = address(0);

  uint256 public roundNumber; // current epoch for prediction round
  uint256 public oracleLatestRoundId; // price oracle (Chainlink)
  uint256 public latestPrice; // price oracle (Chainlink)
  bytes32 public latestRequestId; // latest oracle request id (Chainlink)
  bytes32 public lastRequestId; // last oracle request id (Chainlink)

  bytes32 public specId; //bytes32 jobId
  uint256 public payment; //link amount for call oracle in wei 10000000000000000
  address public assetAddress; //nft address
  string public pricingAsset; // ETH or USD

  enum Position {
    Bull,
    Bear
  }

  struct Round {
    uint256 startTimestamp;
    uint256 bullAmount;
    uint256 bearAmount;
    uint256 totalAmount;
    address bullAddress;
    address bearAddress;
    bool isActive;
  }

  struct BetInfo {
    Position position;
    uint256 amount;
    bool claimed; // default false
  }

  struct DateAndPrice {
    uint128 date;
    uint128 price;
  }

  mapping(uint256 => Round) public rounds;
  mapping(address => uint256[]) public userRounds;
  mapping(uint256 => mapping(address => BetInfo)) public ledger;
  mapping(address => mapping(address => uint256)) public collateral; //collateral[tokenaddress][useraddress]

  event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount);
  event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount);

  event NewAdminAddress(address admin);
  event NewOperatorAddress(address operator);
  event NewOracle(address oracle);

  event Pause(uint256 indexed epoch);
  event RewardsCalculated(
    uint256 indexed epoch,
    uint256 rewardBaseCalAmount,
    uint256 rewardAmount,
    uint256 treasuryAmount
  );

  event StartRound(uint256 indexed epoch);

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
  }

  modifier onlyAdmin() {
    require(msg.sender == adminAddress, "Not admin");
    _;
  }

  modifier onlyAdminOrOperator() {
    require(msg.sender == adminAddress || msg.sender == operatorAddress, "Not operator/admin");
    _;
  }

  modifier onlyOperator() {
    require(msg.sender == operatorAddress, "Not operator");
    _;
  }

  modifier notContract() {
    require(!_isContract(msg.sender), "Contract not allowed");
    require(msg.sender == tx.origin, "Proxy contract not allowed");
    _;
  }

  //show collateral balance in usdc
  function showUsdcBalance() public view returns (uint256) {
    uint256 ethBalance = collateral[ETHER][msg.sender];
    (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
    return ethBalance.mul(uint256(ethPrice));
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

  //create bear position by usdc input parameter
  function betBearUsdc(uint256 _usdAmount) public whenNotPaused nonReentrant {
    (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
    uint256 etherAmount = _usdAmount / uint256(ethPrice);
    betBearEth(etherAmount);
  }

  //user decide to create a bear position
  function betBearEth(uint256 _amount) public whenNotPaused nonReentrant {
    require(
      collateral[ETHER][msg.sender].mul(3) >= _amount,
      "Your bet amount should be lesset than your collateral"
    );
    rounds[roundNumber].bearAddress = msg.sender;
    rounds[roundNumber].bearAmount += _amount;
    rounds[roundNumber].totalAmount += _amount;

    if (rounds[roundNumber].bullAmount > 0 && rounds[roundNumber].isActive == false) {
      rounds[roundNumber].isActive = true;
      rounds[roundNumber].startTimestamp = block.timestamp;
      roundNumber += 1;
    }
  }

  //create bull position by usdc input parameter
  function betBullUsdc(uint256 _usdAmount) public whenNotPaused nonReentrant {
    (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
    uint256 etherAmount = _usdAmount / uint256(ethPrice);
    betBullEth(etherAmount);
  }

  //user decide to create a bull position
  function betBullEth(uint256 _amount) public whenNotPaused nonReentrant {
    require(
      collateral[ETHER][msg.sender].mul(3) >= _amount,
      "Your bet amount should be lesset than your collateral"
    );
    rounds[roundNumber].bullAddress = msg.sender;
    rounds[roundNumber].bullAmount += _amount;
    rounds[roundNumber].totalAmount += _amount;

    if (rounds[roundNumber].bearAmount > 0 && rounds[roundNumber].isActive == false) {
      rounds[roundNumber].isActive = true;
      rounds[roundNumber].startTimestamp = block.timestamp;
      roundNumber += 1;
    }
  }

  //request price from the oracle and save the requrest id
  //should be called befor adjust collateral
  function requestPrice() public onlyOwner {
    bytes32 requestId = nftOracle.getFloorPrice(specId, payment, assetAddress, pricingAsset);
    if (requestId != latestRequestId) {
      lastRequestId = latestRequestId;
      latestRequestId = requestId;
    }
  }

  //Admin executive adjust to calculate profit and loss per minute
  //@notice call the requestPrice() before that
  function adjustCollateral() public whenNotPaused onlyOwner {
    uint256 newPrice = nftOracle.showPrice(latestRequestId);
    uint256 oldPrice = nftOracle.showPrice(lastRequestId);

    if (newPrice != 0 && newPrice / oldPrice < 2 && (newPrice * 10) / oldPrice > 5) {
      for (uint256 i = 0; i <= roundNumber; i++) {
        Round storage round = rounds[i];

        if (round.isActive == true) {
          uint256 reward;

          if (newPrice > oldPrice) {
            reward = (rounds[i].bearAmount * (newPrice - oldPrice)) / oldPrice;
            if (
              collateral[ETHER][rounds[i].bearAddress] - reward <
              collateral[ETHER][rounds[i].bearAddress] / 2
            ) {
              rounds[i].isActive = false;
              latestPrice = newPrice;
            } else {
              collateral[ETHER][rounds[i].bearAddress] -= reward;
              collateral[ETHER][rounds[i].bullAddress] += reward;
              latestPrice = newPrice;
            }
          }

          if (newPrice < oldPrice) {
            reward = (rounds[i].bullAmount * (oldPrice - newPrice)) / newPrice;
            if (
              collateral[ETHER][rounds[i].bullAddress] - reward <
              collateral[ETHER][rounds[i].bullAddress] / 2
            ) {
              rounds[i].isActive = false;
              latestPrice = newPrice;
            } else {
              collateral[ETHER][rounds[i].bullAddress] -= reward;
              collateral[ETHER][rounds[i].bearAddress] += reward;
              latestPrice = newPrice;
            }
          }

        }
      }
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
