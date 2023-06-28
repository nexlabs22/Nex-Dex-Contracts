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

        Exchange exchange = new Exchange(
            address(usdc)
        );
        LinkToken link = new LinkToken();
        MockApiOracle oracle = new MockApiOracle(address(link));
        ExchangeInfo exchangeInfo = new ExchangeInfo(
            address(exchange),
            address(link),
            address(oracle),
            jobId
        );

        //set exchangeInfo
        exchange.setExchangeInfo(address(exchangeInfo));
        //fund link
        link.transfer(address(exchangeInfo), 1e18);
        //set oracle price
        bytes32 requestId = exchangeInfo.requestFundingRate();
        oracle.fulfillOracleFundingRateRequest(requestId, uintToBytes32(10000e18), uintToBytes32(block.timestamp), uintToBytes32(1e17));

        return (
            usdc,
            exchange,
            link,
            oracle,
            exchangeInfo
        );

    }

    function uintToBytes32(uint myUint) public pure returns (bytes32 myBytes32) {
        myBytes32 = bytes32(myUint);
    }
    
}
