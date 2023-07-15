// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../../contracts/Exchange.sol";
import "../../contracts/ExchangeInfo.sol";
import "../../contracts/test/LinkToken.sol";
import "../../contracts/test/MockApiOracle.sol";
import "../../contracts/Token.sol";
import "../../contracts/test/MockV3Aggregator.sol";

contract ExchangeDeployer {

    bytes32 jobId = "6b88e0402e5d415eb946e528b8e0c7ba";
    

    function deployContracts() public returns(Token, Exchange, LinkToken, MockApiOracle, ExchangeInfo) {
        Token usdc = new Token(1000000e18);

        LinkToken link = new LinkToken();
        MockApiOracle oracle = new MockApiOracle(address(link));
        ExchangeInfo exchangeInfo = new ExchangeInfo(
            address(link),
            address(oracle),
            jobId
        );

        Exchange exchange = new Exchange(
            address(usdc),
            address(exchangeInfo),
            "M"
        );
       

        // //set exchangeInfo
        // exchange.setExchangeInfo(address(exchangeInfo));
        //fund link
        link.transfer(address(exchangeInfo), 1e18);
        //set oracle price
        bytes32 requestId = exchangeInfo.requestFundingRate();
        uint[] memory price = new uint[](1);
        price[0] = (10000e18);
        int[] memory fundingRate = new int[](1);
        fundingRate[0] = 1e17;
        string[] memory emptyString = new string[](1);
        emptyString[0] = "M";
        address[] memory addresses = new address[](1);
        addresses[0] = address(exchange);
        oracle.fulfillOracleFundingRateRequest(requestId, price, fundingRate, emptyString, emptyString, addresses);
        
        return (
            usdc,
            exchange,
            link,
            oracle,
            exchangeInfo
        );

    }

    // function updateOracleData(uint _price, int _fundingRate, string memory _name, string memory _contract, address _address) public {
    //     //fund link
    //     link.transfer(address(this), 1e18);
    //     //set oracle price
    //     bytes32 requestId = exchangeInfo.requestFundingRate();
    //     uint[] memory price = new uint[](1);
    //     price[0] = _price;
    //     int[] memory fundingRate = new int[](1);
    //     fundingRate[0] = _fundingRate;
    //     string[] memory emptyString = new string[](1);
    //     emptyString[0] = _name;
    //     address[] memory addresses = new address[](1);
    //     addresses[0] = _address;
    //     oracle.fulfillOracleFundingRateRequest(requestId, price, fundingRate, emptyString, emptyString, addresses);
    // }

    function uintToBytes32(uint myUint) public pure returns (bytes32 myBytes32) {
        myBytes32 = bytes32(myUint);
    }

    function intToBytes32(int x) public pure returns (bytes32) {
        bytes memory b = abi.encodePacked(x);
        bytes32 y = bytesToBytes32(b, 0);
        return y;
    }

    function bytesToBytes32(bytes memory b, uint offset) private pure returns (bytes32) {
        bytes32 out;
        for (uint i = 0; i < 32; i++) {
            out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
        }
        return out;
    }
    
    function uintArrayToBytes32(uint[] memory arr) public pure returns (bytes memory) {
        // bytes memory result = new bytes(32);
        // assembly {
        //     mstore(add(result, 32), mload(add(arr, 32)))
        // }
        // return bytes32(result);
        bytes memory byteArray = new bytes(arr.length * 32); // Each uint takes 32 bytes

        for (uint i = 0; i < arr.length; i++) {
            assembly {
                mstore(add(byteArray, add(32, mul(i, 32))), mload(add(arr, add(32, mul(i, 32)))))
            }
        }

        return byteArray;
    }


    function intArrayToBytes32(int[] memory arr) public pure returns (bytes memory) {
        // bytes memory result = new bytes(32);
        // assembly {
        //     mstore(add(result, 32), mload(add(arr, 32)))
        // }
        // return bytes32(result);
        bytes memory byteArray = new bytes(arr.length * 32); // Each int takes 32 bytes

        for (uint i = 0; i < arr.length; i++) {
            assembly {
                mstore(add(byteArray, add(32, mul(i, 32))), mload(add(arr, add(32, mul(i, 32)))))
            }
        }

        return byteArray;
        
    }


    function stringArrayToBytes32(string[] memory arr) public pure returns (bytes memory) {
    // bytes memory result = new bytes(32);
    // assembly {
    //     mstore(add(result, 32), mload(add(arr, 32)))
    // }
    // return bytes32(result);
    bytes memory byteArray;

        for (uint i = 0; i < arr.length; i++) {
            byteArray = abi.encodePacked(byteArray, bytes(arr[i]));
        }

    return byteArray;
    }

    function addressArrayToBytes(address[] memory addressArray) public pure returns (bytes memory) {
        bytes memory byteArray = abi.encode(addressArray);

        return byteArray;
    }
}
