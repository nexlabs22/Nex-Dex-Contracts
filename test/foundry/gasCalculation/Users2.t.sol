// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../ExchangeDeployer.sol";
import "../../../contracts/Exchange.sol";
import "../../../contracts/ExchangeInfo.sol";
import "../../../contracts/test/LinkToken.sol";
import "../../../contracts/test/MockApiOracle.sol";
import "../../../contracts/Token.sol";
import "../../../contracts/test/MockV3Aggregator.sol";
import "./../helper.sol";

// command: forge test --match-path test/foundry/gasCalculation/Users2.t.sol --contracts exchange

contract Users2 is Test, ExchangeDeployer {
    
    MockV3Aggregator public nftOracle;
    MockV3Aggregator public ethPriceOracle;
    Token public usdc;

    Exchange public exchange;
    ExchangeInfo public exchangeInfo;
    LinkToken public link;
    MockApiOracle public oracle;
    Helper public helper;

    address add1 = vm.addr(1);
    address add2 = vm.addr(2);

    function setUp() public {
        usdc = new Token(1000000e18);
        nftOracle = new MockV3Aggregator(18, 1e18);
        ethPriceOracle = new MockV3Aggregator(18, 1300e18);
        (usdc, exchange, link, oracle, exchangeInfo) = deployContracts();

        helper = new Helper(
            address(exchange),
            address(nftOracle),
            address(ethPriceOracle),
            address(usdc)
        );
        exchange.initialVirtualPool(1e18);
        usdc.transfer(add1, 1000e18);
        usdc.transfer(add2, 1000e18);
    }

    function updateFundingFraction() public {
        uint marketPrice = exchange.marketPrice();
        uint oraclePrice = exchange.oraclePrice();

        int fundingFraction = (int(marketPrice)-int(oraclePrice))*10**18/int(oraclePrice);

        //updating fundingRate
        bytes32 requestId = exchangeInfo.requestFundingRate();
        uint[] memory price = new uint[](1);
        price[0] = (oraclePrice);
        int[] memory fundingRate = new int[](1);
        fundingRate[0] = fundingFraction;
        string[] memory emptyString = new string[](1);
        emptyString[0] = "M";
        address[] memory addresses = new address[](1);
        addresses[0] = address(exchange);
        oracle.fulfillOracleFundingRateRequest(requestId, price, fundingRate, emptyString, emptyString, addresses);
    }


    function testActions() public {
        //user 1 open 1000 usd long postion
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       exchange.openLongPosition(1000e18, 0);
        vm.stopPrank();
       //user 2 open 500 usd long postion
       vm.startPrank(add2);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add2)), 0);
       assertEq(exchange.collateral(address(usdc), address(add2)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 1 close poition
       vm.startPrank(add1);
       exchange.closePositionComplete(0);
       vm.stopPrank();
       //user 1 close poition
       vm.startPrank(add2);
       exchange.closePositionComplete(0);
       vm.stopPrank();
       //update funding fee
       updateFundingFraction();
       //funding fee
       exchange.setFundingRate();
    }

    
    
}