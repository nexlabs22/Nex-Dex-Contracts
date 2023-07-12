// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
pragma abicoder v2;


import {Exchange} from "./Exchange.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

contract ExchangeInfo is Ownable, ChainlinkClient {
    using Chainlink for Chainlink.Request;


    struct Info {
    uint256 assetPrice;
    int256 assetFundingfractionaverage;
    string assetContract;
    address assetAddress;
    bool fundingRateUsed;
    }

    mapping(string => Info) public assetInfo;

    //automation data
    uint public lastUpdateTime;
    
    string baseUrl = "https://app.nexlabs.io/api/allFundingRates";
    string urlParams = "?multiplyFunc=10&timesNegFund=true&arrays=true";

    bytes32 private externalJobId;
    uint256 private oraclePayment;

    event RequestFulfilled(bytes32 indexed requestId,uint256 _number0,uint256 _number1, int256 _number2);

    struct Pool {
    uint256 vAssetPoolSize;
    uint256 vUsdPoolSize;
    }

    // Exchange public exchange;

    constructor(
      // address exchangeAddress, 
      address _chainlinkToken, 
      address _oracleAddress, 
      bytes32 _externalJobId
      ){
        // exchange = Exchange(exchangeAddress);
        setChainlinkToken(_chainlinkToken);
        setChainlinkOracle(_oracleAddress);
        externalJobId = _externalJobId;
        // externalJobId = "81027ac9198848d79a8d14235bf30e16";
        oraclePayment = ((1 * LINK_DIVISIBILITY) / 10); // n * 10**18
    }

  
  function setFundingRateUsed(string memory _name, bool _bool) public onlyOwner {
      assetInfo[_name].fundingRateUsed = _bool;
  }

  function setOracleAddress(address _newOracle) public onlyOwner {
  require(_newOracle != address(0), "New address can not be a zero address");
  setChainlinkOracle(_newOracle);
  }

  function setExternalJobId(bytes32 _jobId) public onlyOwner {
    externalJobId = _jobId;
  }

  function setUrl(string memory _beforeAddress, string memory _afterAddress) public onlyOwner{
    baseUrl = _beforeAddress;
    urlParams = _afterAddress;
  }

  function assetPrice(string memory _name) public view returns(uint){
    return assetInfo[_name].assetPrice;
  }

  function assetFundingfractionaverage(string memory _name) public view returns(int){
    return assetInfo[_name].assetFundingfractionaverage;
  }

  function assetAddress(string memory _name) public view returns(address){
    return assetInfo[_name].assetAddress;
  }

  function assetContract(string memory _name) public view returns(string memory){
    return assetInfo[_name].assetContract;
  }

  function requestFundingRate(
  )
    public
    returns(bytes32)
  {
    
    string memory url = concatenation(baseUrl, urlParams);
    Chainlink.Request memory req = buildChainlinkRequest(externalJobId, address(this), this.fulfillFundingRate.selector);
    req.add("get", url);
    req.add("path1", "results,prices");
    req.add("path2", "results,fundingfractionaverages");
    req.add("path3", "results,names");
    req.add("path4", "results,contracts");
    req.add("path5", "results,addresses");
    // sendOperatorRequest(req, oraclePayment);
    return sendChainlinkRequestTo(chainlinkOracleAddress(), req, oraclePayment);
  }


  function fulfillFundingRate(bytes32 requestId, uint256[] memory _prices, int256[] memory _fundingfractionaverages, string[] memory _names, string[] memory _contracts, address[] memory _addresses)
    public
    recordChainlinkFulfillment(requestId)
  {
    uint[] memory prices0 = _prices;
    int[] memory fundingfractionaverages0 = _fundingfractionaverages;
    string[] memory names0 = _names;
    string[] memory contracts0 = _contracts;
    address[] memory addresses0 = _addresses;

    //save mappings
    for(uint i =0; i < names0.length; i++){
        assetInfo[names0[i]].assetPrice = prices0[i];
        assetInfo[names0[i]].assetFundingfractionaverage = fundingfractionaverages0[i];
        assetInfo[names0[i]].assetContract = contracts0[i];
        assetInfo[names0[i]].assetAddress = addresses0[i];
        assetInfo[names0[i]].fundingRateUsed = false;
    }
    lastUpdateTime = block.timestamp;
  }

  /**
     * Allow withdraw of Link tokens from the contract
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(
            link.transfer(msg.sender, link.balanceOf(address(this))),
            "Unable to transfer"
        );
    }

  


  function concatenation(string memory a, string memory b) public pure returns (string memory) {
        return string(bytes.concat(bytes(a), bytes(b)));
    }
  

  //get minimum long Asset amount that user receives
  function getMinimumLongAssetOut(address _exchangeAddress, uint256 _usdAmount) public view returns (uint256) {
    Exchange exchange = Exchange(_exchangeAddress);
    int256 vAssetPoolSize = int256(exchange.vAssetPoolSize());
    int256 vUsdPoolSize = int256(exchange.vUsdPoolSize());
    int256 k = vAssetPoolSize * vUsdPoolSize;
    int256 newvUsdPoolSize = vUsdPoolSize + int256(_usdAmount);
    int256 newvAssetPoolSize = k / newvUsdPoolSize;

    address[] memory activeUsers = exchange.getAllActiveUsers();
    for (uint256 i; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isHardLiquidatable = exchange._isHardLiquidatable(
          activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          //update new pool
          k = newvAssetPoolSize * newvUsdPoolSize;
          newvAssetPoolSize += exchange.uservAssetBalance(activeUsers[i]);
          newvUsdPoolSize = k / newvAssetPoolSize;
          //update pool
          k = vAssetPoolSize * vUsdPoolSize;
          vAssetPoolSize += exchange.uservAssetBalance(activeUsers[i]);
          vUsdPoolSize = k / vAssetPoolSize;
        }
      }
    }

    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isPartialLiquidatable = exchange._isPartialLiquidatable(
          activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          uint256 vUsdPartialLiquidateAmount = exchange._calculatePartialLiquidateValue(
            activeUsers[i],
            uint256(newvAssetPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (exchange.uservAssetBalance(activeUsers[i]) > 0) {
            //update new pool
            k = newvAssetPoolSize * newvUsdPoolSize;
            newvUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            newvAssetPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vAssetPoolSize * vUsdPoolSize;
            vUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            vAssetPoolSize = k / vUsdPoolSize;
          } else if (exchange.uservAssetBalance(activeUsers[i]) < 0) {
            //update new pool
            k = newvAssetPoolSize * newvUsdPoolSize;
            newvUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            newvAssetPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vAssetPoolSize * vUsdPoolSize;
            vUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            vAssetPoolSize = k / vUsdPoolSize;
          }
        }
      }
    }

    k = vAssetPoolSize * vUsdPoolSize;
    int256 finalvUsdPoolSize = vUsdPoolSize + int256(_usdAmount);
    int256 finalvAssetPoolSize = k / finalvUsdPoolSize;
    int256 userAssetOut = vAssetPoolSize - finalvAssetPoolSize;
    return uint256(userAssetOut);
  }


  //get minimum short Asset amount that user receives
  function getMinimumShortAssetOut(address _exchangeAddress, uint256 _usdAmount) public view returns (uint) {
    Exchange exchange = Exchange(_exchangeAddress);
    int256 vAssetPoolSize = int256(exchange.vAssetPoolSize());
    int256 vUsdPoolSize = int256(exchange.vUsdPoolSize());
    int256 k = vAssetPoolSize * vUsdPoolSize;
    int256 newvUsdPoolSize = vUsdPoolSize - int256(_usdAmount);
    int256 newvAssetPoolSize = k / newvUsdPoolSize;

    address[] memory activeUsers = exchange.getAllActiveUsers();
    for (uint256 i; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isHardLiquidatable = exchange._isHardLiquidatable(
          activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) { 
          //update new pool
          k = newvAssetPoolSize * newvUsdPoolSize;
          newvAssetPoolSize += exchange.uservAssetBalance(activeUsers[i]);
          newvUsdPoolSize = k / newvAssetPoolSize;
          //update pool
          k = vAssetPoolSize * vUsdPoolSize;
          vAssetPoolSize += exchange.uservAssetBalance(activeUsers[i]);
          vUsdPoolSize = k / vAssetPoolSize;
          
        }
      }
    }
    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isPartialLiquidatable = exchange._isPartialLiquidatable(
          activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          
          uint256 vUsdPartialLiquidateAmount = exchange._calculatePartialLiquidateValue(
            activeUsers[i],
            uint256(newvAssetPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (exchange.uservAssetBalance(activeUsers[i]) > 0) {
            //update new pool
            k = newvAssetPoolSize * newvUsdPoolSize;
            newvUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            newvAssetPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vAssetPoolSize * vUsdPoolSize;
            vUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            vAssetPoolSize = k / vUsdPoolSize;
          } else if (exchange.uservAssetBalance(activeUsers[i]) < 0) {
            //update new pool
            k = newvAssetPoolSize * newvUsdPoolSize;
            newvUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            newvAssetPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vAssetPoolSize * vUsdPoolSize;
            vUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            vAssetPoolSize = k / vUsdPoolSize;
          }
        }
      }
    }

    k = vAssetPoolSize * vUsdPoolSize;
    int256 finalvUsdPoolSize = vUsdPoolSize - int256(_usdAmount);
    int256 finalvAssetPoolSize = k / finalvUsdPoolSize;
    int256 userAssetOut = finalvAssetPoolSize - vAssetPoolSize;

    return uint256(userAssetOut);

  }

    
  //get minimum long usd amount that user receives
  function getMinimumLongUsdOut(address _exchangeAddress, uint256 _AssetAmount) public view returns (uint256) {
    Exchange exchange = Exchange(_exchangeAddress);
    int256 vAssetPoolSize = int256(exchange.vAssetPoolSize());
    int256 vUsdPoolSize = int256(exchange.vUsdPoolSize());
    int256 k = vAssetPoolSize * vUsdPoolSize;
    int256 newvAssetPoolSize = vAssetPoolSize - int256(_AssetAmount);
    int256 newvUsdPoolSize = k / newvAssetPoolSize;  

    address[] memory activeUsers = exchange.getAllActiveUsers();
    for (uint256 i; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isHardLiquidatable = exchange._isHardLiquidatable(
          activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          
          //update new pool
          k = newvAssetPoolSize * newvUsdPoolSize;
          newvAssetPoolSize += exchange.uservAssetBalance(activeUsers[i]);
          newvUsdPoolSize = k / newvAssetPoolSize;
          //update pool
          k = vAssetPoolSize * vUsdPoolSize;
          vAssetPoolSize += exchange.uservAssetBalance(activeUsers[i]);
          vUsdPoolSize = k / vAssetPoolSize;
        }
      }
    }

    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isPartialLiquidatable = exchange._isPartialLiquidatable(
          activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          uint256 vUsdPartialLiquidateAmount = exchange._calculatePartialLiquidateValue(
            activeUsers[i],
            uint256(newvAssetPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (exchange.uservAssetBalance(activeUsers[i]) > 0) {
            //update new pool
            k = newvAssetPoolSize * newvUsdPoolSize;
            newvUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            newvAssetPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vAssetPoolSize * vUsdPoolSize;
            vUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            vAssetPoolSize = k / vUsdPoolSize;
          } else if (exchange.uservAssetBalance(activeUsers[i]) < 0) {
            //update new pool
            k = newvAssetPoolSize * newvUsdPoolSize;
            newvUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            newvAssetPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vAssetPoolSize * vUsdPoolSize;
            vUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            vAssetPoolSize = k / vUsdPoolSize;
          }
        }
      }
    }


    k = vAssetPoolSize * vUsdPoolSize;
    int256 finalvAssetPoolSize = vAssetPoolSize - int256(_AssetAmount);
    int256 finalvUsdPoolSize = k / finalvAssetPoolSize;
    int256 userUsdOut = finalvUsdPoolSize - vUsdPoolSize;
    return uint256(userUsdOut);
  }



  //get minimum short usd amount that user receives
  function getMinimumShortUsdOut(address _exchangeAddress, uint256 _AssetAmount) public view returns (uint256) {
    Exchange exchange = Exchange(_exchangeAddress);
    int256 vAssetPoolSize = int256(exchange.vAssetPoolSize());
    int256 vUsdPoolSize = int256(exchange.vUsdPoolSize());
    int256 k = vAssetPoolSize * vUsdPoolSize;
    int256 newvAssetPoolSize = vAssetPoolSize + int256(_AssetAmount);
    int256 newvUsdPoolSize = k / newvAssetPoolSize;  

    address[] memory activeUsers = exchange.getAllActiveUsers();
    for (uint256 i; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isHardLiquidatable = exchange._isHardLiquidatable(
          activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          
          //update new pool
          k = newvAssetPoolSize * newvUsdPoolSize;
          newvAssetPoolSize += exchange.uservAssetBalance(activeUsers[i]);
          newvUsdPoolSize = k / newvAssetPoolSize;
          //update pool
          k = vAssetPoolSize * vUsdPoolSize;
          vAssetPoolSize += exchange.uservAssetBalance(activeUsers[i]);
          vUsdPoolSize = k / vAssetPoolSize;
        }
      }
    }

    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isPartialLiquidatable = exchange._isPartialLiquidatable(
          activeUsers[i],
          uint256(newvAssetPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          uint256 vUsdPartialLiquidateAmount = exchange._calculatePartialLiquidateValue(
            activeUsers[i],
            uint256(newvAssetPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (exchange.uservAssetBalance(activeUsers[i]) > 0) {
            //update new pool
            k = newvAssetPoolSize * newvUsdPoolSize;
            newvUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            newvAssetPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vAssetPoolSize * vUsdPoolSize;
            vUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            vAssetPoolSize = k / vUsdPoolSize;
          } else if (exchange.uservAssetBalance(activeUsers[i]) < 0) {
            //update new pool
            k = newvAssetPoolSize * newvUsdPoolSize;
            newvUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            newvAssetPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vAssetPoolSize * vUsdPoolSize;
            vUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            vAssetPoolSize = k / vUsdPoolSize;
          }
        }
      }
    }

    k = vAssetPoolSize * vUsdPoolSize;
    int256 finalvAssetPoolSize = vAssetPoolSize + int256(_AssetAmount);
    int256 finalvUsdPoolSize = k / finalvAssetPoolSize;
    int256 userUsdOut = vUsdPoolSize - finalvUsdPoolSize;
    return uint256(userUsdOut);
  }
  
  
}