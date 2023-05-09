// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../../../contracts/Index-contracts/Gold.sol";
import "../../../contracts/ExchangeInfo.sol";
import "../../../contracts/Token.sol";
import "../../../contracts/test/MockV3Aggregator.sol";
import "../helper.sol";

contract GoldTest is Test {
    Gold public exchange;
    ExchangeInfo public exchangeInfo;

    
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
        usdc = new Token(1000000e18);
        nftOracle = new MockV3Aggregator(18, 1e18);
        ethPriceOracle = new MockV3Aggregator(18, 1300e18);
        exchange = new Gold(
            address(nftOracle),
            address(ethPriceOracle),
            address(usdc)
        );
        exchangeInfo = new ExchangeInfo(
            address(exchange)
        );
        helper = new Helper(
            address(exchange),
            address(nftOracle),
            address(ethPriceOracle),
            address(usdc)
        );
        exchange.initialVirtualPool(5000e18, 5e17);
        usdc.transfer(add1, 1000e18);
        usdc.transfer(add2, 1000e18);
        usdc.transfer(add3, 1000e18);
        usdc.transfer(add4, 1000e18);
        usdc.transfer(add5, 1000e18);
    }


    function testAddAndWithdrawCollateral() public {
       uint startvBaycPoolSize = exchange.vBaycPoolSize();
       uint startvUsdPoolSize = exchange.vUsdPoolSize();
       uint marketPrice = exchange.marketPrice();
       assertEq(startvUsdPoolSize, 5000e18);
       assertEq(startvBaycPoolSize, 10000e18);
       assertEq(marketPrice, 5e17);
       
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       exchange.withdrawCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 1000e18);
       assertEq(exchange.collateral(address(usdc), address(add1)), 0);
       uint endvBaycPoolSize = exchange.vBaycPoolSize();
       uint endvUsdPoolSize = exchange.vUsdPoolSize();
       assertEq(startvBaycPoolSize, endvBaycPoolSize);
       assertEq(startvUsdPoolSize, endvUsdPoolSize);
       
    }

    
    function testOpenAndClosePosition() public {
       uint startvBaycPoolSize = exchange.vBaycPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       (address[] memory hardLiquidateUsers, address[] memory partialLiquidateUsers) = exchangeInfo.openLongLiquidateList(1000e18);
       exchange.openLongPosition(1000e18, 0, hardLiquidateUsers, partialLiquidateUsers);
       uint baycValue = exchange.getShortVusdAmountOut(exchange.positive(exchange.uservBaycBalance(add1)));
       
       int baycBalance = exchange.uservUsdBalance(add1);
    
       uint middlevBaycPoolSize = exchange.vBaycPoolSize();
       (hardLiquidateUsers, partialLiquidateUsers) = exchangeInfo.closeLongLiquidateList(exchange.positive(exchange.uservBaycBalance(add1)));
       exchange.closePositionComplete(0, hardLiquidateUsers, partialLiquidateUsers);
       uint endCollateral = exchange.collateral(address(usdc), address(add1));
       uint endvBaycPoolSize = exchange.vBaycPoolSize();
       uint endUsdPoolSize = exchange.vUsdPoolSize();
       uint endExchangeBalance = usdc.balanceOf(address(exchange));
       
       assertEq(startvBaycPoolSize, endvBaycPoolSize);

       
    }
    
    
    function testPNL() public {
        //user 1 open 1000 usd long postion
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       (address[] memory hardLiquidateUsers, address[] memory partialLiquidateUsers) = exchangeInfo.openLongLiquidateList(1000e18);
       exchange.openLongPosition(1000e18, 0, hardLiquidateUsers, partialLiquidateUsers);
       
       uint price1 = exchange.marketPrice();
        vm.stopPrank();
       //user 2 open 500 usd long postion
       vm.startPrank(add2);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add2)), 0);
       assertEq(exchange.collateral(address(usdc), address(add2)), 1000e18);
       (hardLiquidateUsers, partialLiquidateUsers) = exchangeInfo.openLongLiquidateList(1600e18);
       exchange.openLongPosition(1600e18, 0, hardLiquidateUsers, partialLiquidateUsers);
        vm.stopPrank();
       vm.startPrank(add1);
       uint newUsdValue = helper.getShortVusdAmountOut(uint(exchange.uservBaycBalance(add1)));
       int pnl =  int(newUsdValue) - (-exchange.uservUsdBalance(add1));
       assertEq(exchange.getPNL(add1), pnl);
       uint lastCollateral = exchange.collateral(address(usdc), add1);
       uint lastPositionValue = exchange.getShortVusdAmountOut(uint(exchange.uservBaycBalance(add1)));
       (hardLiquidateUsers, partialLiquidateUsers) = exchangeInfo.closeLongLiquidateList(exchange.positive(exchange.uservBaycBalance(add1)));
       exchange.closePositionComplete(0, hardLiquidateUsers, partialLiquidateUsers);
        /*
       */
    }
    
    
}
