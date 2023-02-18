// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../../contracts/Exchange.sol";
import "../../contracts/Token.sol";
import "../../contracts/test/MockV3AggregatorV8.sol";
import "./helper.sol";

contract Positions is Test {
    Exchange public exchange;
    
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
        exchange = new Exchange(
            address(nftOracle),
            address(ethPriceOracle),
            address(usdc)
        );
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


    function testAddAndWithdrawCollateral() public {
       uint startvBaycPoolSize = exchange.vBaycPoolSize();
       uint startvUsdPoolSize = exchange.vUsdPoolSize();
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

    function testDiv() public {
        uint vBaycPoolSize = exchange.vBaycPoolSize();//10
        uint vUsdPoolSize = exchange.vUsdPoolSize();//100

         
        uint k = vBaycPoolSize * vUsdPoolSize;//1000
        uint newvUsdPoolSize = vUsdPoolSize + 1000e18;//110
        uint newvBaycPoolSize = k / newvUsdPoolSize;//9

        uint k2 = newvBaycPoolSize * newvUsdPoolSize;//990
        uint positivek = k2 > k ? (k2-k)*1e18/newvUsdPoolSize : 0;
        uint negativek = k > k2 ? (k-k2)*1e18/newvUsdPoolSize : 0;
        console.log("GGG", (k-k2)/newvUsdPoolSize);
        newvBaycPoolSize = (newvBaycPoolSize*1e18 - positivek + negativek)/1e18;
        // console.log("GGG", vBaycPoolSize * vUsdPoolSize - newvBaycPoolSize * newvUsdPoolSize);
        uint userBaycBalance = vBaycPoolSize - newvBaycPoolSize;

        uint k3 = newvBaycPoolSize * newvUsdPoolSize;
        uint newvBaycPoolSize2 = newvBaycPoolSize + userBaycBalance;
        uint newvUsdPoolSize2 = k3 / newvBaycPoolSize2;

        uint k4 = newvBaycPoolSize2*newvUsdPoolSize2;
        uint positivek2 = k4 > k3 ? (k4-k3)*1e18/newvBaycPoolSize2 : 0;
        uint negativek2 = k3 > k4 ? (k3-k4)*1e18/newvBaycPoolSize2 : 0;
        newvUsdPoolSize2 = (newvUsdPoolSize2*1e18 - positivek2 + negativek2);
        uint uservUsdBalance = newvUsdPoolSize - newvUsdPoolSize2 ;

        
        
        console.log("HHH", uservUsdBalance);
        // console.log("GGG", newvBaycPoolSize * newvUsdPoolSize - vBaycPoolSize * vUsdPoolSize);
        // console.log("k4-k3", k4 > k3 ? (k4-k3)/1e18 : (k3-k4)/1e18);
        // console.log("k3-k2", k3 > k2 ? (k3-k2)/1e18 : (k2-k3)/1e18);
        // console.log("k2-k", k2 > k ? (k2-k)/1e18 : (k-k2)/1e18);
        // console.log("K1", k);
        // console.log("K2", k2);
        // console.log("&K", k2 > k ? (k2-k)/1e18 : (k-k2)/1e18);
    }

    /*
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
       exchange.openLongPosition(1000e18, 0);
       uint baycValue = exchange.getShortVusdAmountOut(exchange.positive(exchange.uservBaycBalance(add1)));
       console.log("bayc value", baycValue);
       int baycBalance = exchange.uservUsdBalance(add1);
       console.log("vUsd balance", exchange.positive(baycBalance));
       uint middlevBaycPoolSize = exchange.vBaycPoolSize();
       exchange.closePositionComplete(0);
       uint endCollateral = exchange.collateral(address(usdc), address(add1));
       uint endvBaycPoolSize = exchange.vBaycPoolSize();
       uint endUsdPoolSize = exchange.vUsdPoolSize();
       uint endExchangeBalance = usdc.balanceOf(address(exchange));

        console.log("first col", firstCollateral);
        console.log("end col", endCollateral);
        console.log("first usd pool", startUsdPoolSize);
        console.log("end usd pool", endUsdPoolSize);
        console.log("first pool", startvBaycPoolSize);
        console.log("middle pool", middlevBaycPoolSize);
        console.log("end pool", endvBaycPoolSize);
        console.log("start balance", startExchangeBalance);
        console.log("end balance", endExchangeBalance);
        console.log("FINISH", endCollateral - endExchangeBalance);
    //    exchange.withdrawCollateral(exchange.collateral(address(usdc), address(add1)));
       
       assertEq(startvBaycPoolSize, endvBaycPoolSize);

       
    }
    */
    /*
    function testPNL() public {
        //user 1 open 1000 usd long postion
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       exchange.openLongPosition(1000e18, 0);
       
       uint price1 = exchange.marketPrice();
        vm.stopPrank();
       //user 2 open 500 usd long postion
       vm.startPrank(add2);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add2)), 0);
       assertEq(exchange.collateral(address(usdc), address(add2)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();

       vm.startPrank(add1);
       uint newUsdValue = helper.getShortVusdAmountOut(uint(exchange.uservBaycBalance(add1)));
       int pnl =  int(newUsdValue) - (-exchange.uservUsdBalance(add1));
       assertEq(exchange.getPNL(add1), pnl);
       uint lastCollateral = exchange.collateral(address(usdc), add1);
       uint lastPositionValue = exchange.getShortVusdAmountOut(uint(exchange.uservBaycBalance(add1)));
       exchange.closePositionComplete(0);
       assertEq(exchange.collateral(address(usdc), add1), lastCollateral + uint(pnl) - lastPositionValue/1000);
       console.log("add1 position notional", exchange.getPositionNotional(add1)/1e15);
    }
    */
    
}
