// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "./ExchangeDeployer.sol";
import "../../contracts/Exchange.sol";
import "../../contracts/ExchangeInfo.sol";
import "../../contracts/test/LinkToken.sol";
import "../../contracts/test/MockApiOracle.sol";
import "../../contracts/Token.sol";
import "../../contracts/test/MockV3Aggregator.sol";
import "./helper.sol";

contract FundingRate is Test, ExchangeDeployer {

    Exchange public exchange;
    ExchangeInfo public exchangeInfo;
    LinkToken public link;
    MockApiOracle public oracle;
   

    Token public usdc;
    MockV3Aggregator public nftOracle;
    MockV3Aggregator public ethPriceOracle;

    Helper public helper;

    address add1 = vm.addr(1);
    address add2 = vm.addr(2);
    address add3 = vm.addr(3);
    address add4 = vm.addr(4);
    address add5 = vm.addr(5);
    address add6 = vm.addr(6);

    function setUp() public {
        
        nftOracle = new MockV3Aggregator(18, 5e18);
        ethPriceOracle = new MockV3Aggregator(18, 2000e18);

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
        usdc.transfer(add3, 1000e18);
        usdc.transfer(add4, 1000e18);
        usdc.transfer(add5, 1000e18);

    }

    function updateFundingFraction() public {
        uint marketPrice = exchange.marketPrice();
        uint oraclePrice = exchange.oraclePrice();
       console.log("oraclePrice0: ", oraclePrice);
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

    

    function testFundingRewards() public {
    //    uint oraclePrice = exchange.oraclePrice();
    //    console.log("oraclePrice: ", oraclePrice);
    //    updateFundingFraction();
    //    return;
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startvUsdPoolSize = exchange.vUsdPoolSize();
       //add1 add collateral
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       vm.stopPrank();
       //add2 add collateral
       vm.startPrank(add2);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add2)), 0);
       assertEq(exchange.collateral(address(usdc), address(add2)), 1000e18);
       vm.stopPrank();
       //add3 add collateral
       vm.startPrank(add3);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add3)), 0);
       assertEq(exchange.collateral(address(usdc), address(add3)), 1000e18);
       vm.stopPrank();
       //add4 add collateral
       vm.startPrank(add4);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add4)), 0);
       assertEq(exchange.collateral(address(usdc), address(add4)), 1000e18);
       vm.stopPrank();

       //add1 opens a long position
       vm.startPrank(add1);
       exchange.openLongPosition(1000e18, 0);
       vm.stopPrank();
       //add2 opens a short position
       vm.startPrank(add2);
       exchange.openLongPosition(1000e18, 0);
       vm.stopPrank();
       //add3 opens a short position
       vm.startPrank(add3);
       exchange.openShortPosition(1000e18, 0);
       vm.stopPrank();
       //add4 opens a short position
       vm.startPrank(add4);
       exchange.openShortPosition(1000e18, 0);
       vm.stopPrank();
       //update funding fee
       updateFundingFraction();
       // runs fundingRate function
       exchange.setFundingRate();
       int add1FundingFee = exchange.virtualCollateral(add1);
       int add2FundingFee = exchange.virtualCollateral(add2);
       int add3FundingFee = exchange.virtualCollateral(add3);
       int add4FundingFee = exchange.virtualCollateral(add4);
       assertEq(add1FundingFee + add2FundingFee, -(add3FundingFee + add4FundingFee));
    }

}