// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
pragma abicoder v2;


import {Exchange} from "./Exchange.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

contract ExchangeInfo is Ownable, ChainlinkClient {
    using Chainlink for Chainlink.Request;

    //oracle data
    uint public oraclePrice;
    uint public lastMarketPrice;
    uint public lastFundingRateTime;
    int public lastFundingRateAmount;
    
    string baseUrl = "https://app.nexlabs.io/api/lastFundingRate?address=";
    string urlParams = "&returnType=number&multiplyFunc=18&timesNegFund=true";

    bytes32 private externalJobId;
    uint256 private oraclePayment;

    event RequestFulfilled(bytes32 indexed requestId,uint256 _number0,uint256 _number1, int256 _number2);

    struct Pool {
    uint256 vBaycPoolSize;
    uint256 vUsdPoolSize;
    }

    Exchange public exchange;

    constructor(
      address exchangeAddress, 
      address _chainlinkToken, 
      address _oracleAddress, 
      bytes32 _externalJobId
      ){
        exchange = Exchange(exchangeAddress);
        setChainlinkToken(_chainlinkToken);
        setChainlinkOracle(_oracleAddress);
        externalJobId = _externalJobId;
        // externalJobId = "81027ac9198848d79a8d14235bf30e16";
        oraclePayment = ((1 * LINK_DIVISIBILITY) / 10); // n * 10**18
    }

  function changeExchangeAddress(address exchangeAddress) public onlyOwner {
      exchange = Exchange(exchangeAddress);
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

  function requestFundingRate(
  )
    public
    returns(bytes32)
  {
    
    string memory url = concatenateAddressToString(baseUrl, address(exchange), urlParams);
    Chainlink.Request memory req = buildChainlinkRequest(externalJobId, address(this), this.fulfillFundingRate.selector);
    req.add("get", url);
    req.add("path1", "price");
    req.add("path2", "time");
    req.add("path3", "fundingfractionaverage");
    req.addInt("times", 1);
    // sendOperatorRequest(req, oraclePayment);
    return sendChainlinkRequestTo(chainlinkOracleAddress(), req, oraclePayment);
  }


  function fulfillFundingRate(bytes32 requestId, uint256 _number0, uint256 _number1, int256 _number2)
    public
    recordChainlinkFulfillment(requestId)
  {
    emit RequestFulfilled(requestId, _number0, _number1, _number2);
    oraclePrice = _number0;
    lastFundingRateTime = _number1;
    lastFundingRateAmount = _number2;
    lastMarketPrice = market();
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

  function market() public view returns(uint){
      uint vUsdPoolSize = exchange.vUsdPoolSize();
      uint vBaycPoolSize = exchange.vBaycPoolSize();
      if(vUsdPoolSize > 0 && vBaycPoolSize > 0){
      uint marketPrice = (1e18 *vUsdPoolSize) / vBaycPoolSize;
      return marketPrice;
      }else{
          return 0;
      }
  }


  function concatenateAddressToString(string memory _string, address _address, string memory _string2) public pure returns (string memory) {
        return string.concat(_string, addressToString(_address), _string2);
    }

    function addressToString(address _address) internal pure returns (string memory) {
    bytes32 _bytes = bytes32(uint256(uint160(_address)));
    bytes memory HEX = "0123456789abcdef";
    bytes memory _string = new bytes(42);
    _string[0] = '0';
    _string[1] = 'x';
    for (uint i = 0; i < 20; i++) {
        _string[2+i*2] = HEX[uint8(_bytes[i + 12] >> 4)];
        _string[3+i*2] = HEX[uint8(_bytes[i + 12] & 0x0f)];
    }
    return string(_string);
  }

  //get minimum long bayc amount that user receives
  function getMinimumLongBaycOut(uint256 _usdAmount) public view returns (uint256) {
    int256 vBaycPoolSize = int256(exchange.vBaycPoolSize());
    int256 vUsdPoolSize = int256(exchange.vUsdPoolSize());
    int256 k = vBaycPoolSize * vUsdPoolSize;
    int256 newvUsdPoolSize = vUsdPoolSize + int256(_usdAmount);
    int256 newvBaycPoolSize = k / newvUsdPoolSize;

    address[] memory activeUsers = exchange.getAllActiveUsers();
    for (uint256 i; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isHardLiquidatable = exchange._isHardLiquidatable(
          activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          //update new pool
          k = newvBaycPoolSize * newvUsdPoolSize;
          newvBaycPoolSize += exchange.uservBaycBalance(activeUsers[i]);
          newvUsdPoolSize = k / newvBaycPoolSize;
          //update pool
          k = vBaycPoolSize * vUsdPoolSize;
          vBaycPoolSize += exchange.uservBaycBalance(activeUsers[i]);
          vUsdPoolSize = k / vBaycPoolSize;
        }
      }
    }

    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isPartialLiquidatable = exchange._isPartialLiquidatable(
          activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          uint256 vUsdPartialLiquidateAmount = exchange._calculatePartialLiquidateValue(
            activeUsers[i],
            uint256(newvBaycPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (exchange.uservBaycBalance(activeUsers[i]) > 0) {
            //update new pool
            k = newvBaycPoolSize * newvUsdPoolSize;
            newvUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            newvBaycPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vBaycPoolSize * vUsdPoolSize;
            vUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            vBaycPoolSize = k / vUsdPoolSize;
          } else if (exchange.uservBaycBalance(activeUsers[i]) < 0) {
            //update new pool
            k = newvBaycPoolSize * newvUsdPoolSize;
            newvUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            newvBaycPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vBaycPoolSize * vUsdPoolSize;
            vUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            vBaycPoolSize = k / vUsdPoolSize;
          }
        }
      }
    }

    k = vBaycPoolSize * vUsdPoolSize;
    int256 finalvUsdPoolSize = vUsdPoolSize + int256(_usdAmount);
    int256 finalvBaycPoolSize = k / finalvUsdPoolSize;
    int256 userBaycOut = vBaycPoolSize - finalvBaycPoolSize;
    return uint256(userBaycOut);
  }


  //get minimum short bayc amount that user receives
  function getMinimumShortBaycOut(uint256 _usdAmount) public view returns (uint) {
    int256 vBaycPoolSize = int256(exchange.vBaycPoolSize());
    int256 vUsdPoolSize = int256(exchange.vUsdPoolSize());
    int256 k = vBaycPoolSize * vUsdPoolSize;
    int256 newvUsdPoolSize = vUsdPoolSize - int256(_usdAmount);
    int256 newvBaycPoolSize = k / newvUsdPoolSize;

    address[] memory activeUsers = exchange.getAllActiveUsers();
    for (uint256 i; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isHardLiquidatable = exchange._isHardLiquidatable(
          activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) { 
          //update new pool
          k = newvBaycPoolSize * newvUsdPoolSize;
          newvBaycPoolSize += exchange.uservBaycBalance(activeUsers[i]);
          newvUsdPoolSize = k / newvBaycPoolSize;
          //update pool
          k = vBaycPoolSize * vUsdPoolSize;
          vBaycPoolSize += exchange.uservBaycBalance(activeUsers[i]);
          vUsdPoolSize = k / vBaycPoolSize;
          
        }
      }
    }
    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isPartialLiquidatable = exchange._isPartialLiquidatable(
          activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          
          uint256 vUsdPartialLiquidateAmount = exchange._calculatePartialLiquidateValue(
            activeUsers[i],
            uint256(newvBaycPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (exchange.uservBaycBalance(activeUsers[i]) > 0) {
            //update new pool
            k = newvBaycPoolSize * newvUsdPoolSize;
            newvUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            newvBaycPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vBaycPoolSize * vUsdPoolSize;
            vUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            vBaycPoolSize = k / vUsdPoolSize;
          } else if (exchange.uservBaycBalance(activeUsers[i]) < 0) {
            //update new pool
            k = newvBaycPoolSize * newvUsdPoolSize;
            newvUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            newvBaycPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vBaycPoolSize * vUsdPoolSize;
            vUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            vBaycPoolSize = k / vUsdPoolSize;
          }
        }
      }
    }

    k = vBaycPoolSize * vUsdPoolSize;
    int256 finalvUsdPoolSize = vUsdPoolSize - int256(_usdAmount);
    int256 finalvBaycPoolSize = k / finalvUsdPoolSize;
    int256 userBaycOut = finalvBaycPoolSize - vBaycPoolSize;

    return uint256(userBaycOut);

  }

    
  //get minimum long usd amount that user receives
  function getMinimumLongUsdOut(uint256 _BaycAmount) public view returns (uint256) {
    int256 vBaycPoolSize = int256(exchange.vBaycPoolSize());
    int256 vUsdPoolSize = int256(exchange.vUsdPoolSize());
    int256 k = vBaycPoolSize * vUsdPoolSize;
    int256 newvBaycPoolSize = vBaycPoolSize - int256(_BaycAmount);
    int256 newvUsdPoolSize = k / newvBaycPoolSize;  

    address[] memory activeUsers = exchange.getAllActiveUsers();
    for (uint256 i; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isHardLiquidatable = exchange._isHardLiquidatable(
          activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          
          //update new pool
          k = newvBaycPoolSize * newvUsdPoolSize;
          newvBaycPoolSize += exchange.uservBaycBalance(activeUsers[i]);
          newvUsdPoolSize = k / newvBaycPoolSize;
          //update pool
          k = vBaycPoolSize * vUsdPoolSize;
          vBaycPoolSize += exchange.uservBaycBalance(activeUsers[i]);
          vUsdPoolSize = k / vBaycPoolSize;
        }
      }
    }

    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isPartialLiquidatable = exchange._isPartialLiquidatable(
          activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          uint256 vUsdPartialLiquidateAmount = exchange._calculatePartialLiquidateValue(
            activeUsers[i],
            uint256(newvBaycPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (exchange.uservBaycBalance(activeUsers[i]) > 0) {
            //update new pool
            k = newvBaycPoolSize * newvUsdPoolSize;
            newvUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            newvBaycPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vBaycPoolSize * vUsdPoolSize;
            vUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            vBaycPoolSize = k / vUsdPoolSize;
          } else if (exchange.uservBaycBalance(activeUsers[i]) < 0) {
            //update new pool
            k = newvBaycPoolSize * newvUsdPoolSize;
            newvUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            newvBaycPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vBaycPoolSize * vUsdPoolSize;
            vUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            vBaycPoolSize = k / vUsdPoolSize;
          }
        }
      }
    }


    k = vBaycPoolSize * vUsdPoolSize;
    int256 finalvBaycPoolSize = vBaycPoolSize - int256(_BaycAmount);
    int256 finalvUsdPoolSize = k / finalvBaycPoolSize;
    int256 userUsdOut = finalvUsdPoolSize - vUsdPoolSize;
    return uint256(userUsdOut);
  }



  //get minimum short usd amount that user receives
  function getMinimumShortUsdOut(uint256 _BaycAmount) public view returns (uint256) {
    int256 vBaycPoolSize = int256(exchange.vBaycPoolSize());
    int256 vUsdPoolSize = int256(exchange.vUsdPoolSize());
    int256 k = vBaycPoolSize * vUsdPoolSize;
    int256 newvBaycPoolSize = vBaycPoolSize + int256(_BaycAmount);
    int256 newvUsdPoolSize = k / newvBaycPoolSize;  

    address[] memory activeUsers = exchange.getAllActiveUsers();
    for (uint256 i; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isHardLiquidatable = exchange._isHardLiquidatable(
          activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isHardLiquidatable == true) {
          
          //update new pool
          k = newvBaycPoolSize * newvUsdPoolSize;
          newvBaycPoolSize += exchange.uservBaycBalance(activeUsers[i]);
          newvUsdPoolSize = k / newvBaycPoolSize;
          //update pool
          k = vBaycPoolSize * vUsdPoolSize;
          vBaycPoolSize += exchange.uservBaycBalance(activeUsers[i]);
          vUsdPoolSize = k / vBaycPoolSize;
        }
      }
    }

    for (uint256 i = 0; i < activeUsers.length; i++) {
      if (activeUsers[i] != address(0)) {
        bool isPartialLiquidatable = exchange._isPartialLiquidatable(
          activeUsers[i],
          uint256(newvBaycPoolSize),
          uint256(newvUsdPoolSize)
        );
        if (isPartialLiquidatable == true) {
          uint256 vUsdPartialLiquidateAmount = exchange._calculatePartialLiquidateValue(
            activeUsers[i],
            uint256(newvBaycPoolSize),
            uint256(newvUsdPoolSize)
          );
          if (exchange.uservBaycBalance(activeUsers[i]) > 0) {
            //update new pool
            k = newvBaycPoolSize * newvUsdPoolSize;
            newvUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            newvBaycPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vBaycPoolSize * vUsdPoolSize;
            vUsdPoolSize -= int256(vUsdPartialLiquidateAmount);
            vBaycPoolSize = k / vUsdPoolSize;
          } else if (exchange.uservBaycBalance(activeUsers[i]) < 0) {
            //update new pool
            k = newvBaycPoolSize * newvUsdPoolSize;
            newvUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            newvBaycPoolSize = k / newvUsdPoolSize;
            //update pool
            k = vBaycPoolSize * vUsdPoolSize;
            vUsdPoolSize += int256(vUsdPartialLiquidateAmount);
            vBaycPoolSize = k / vUsdPoolSize;
          }
        }
      }
    }

    k = vBaycPoolSize * vUsdPoolSize;
    int256 finalvBaycPoolSize = vBaycPoolSize + int256(_BaycAmount);
    int256 finalvUsdPoolSize = k / finalvBaycPoolSize;
    int256 userUsdOut = vUsdPoolSize - finalvUsdPoolSize;
    return uint256(userUsdOut);
  }
  
  
}