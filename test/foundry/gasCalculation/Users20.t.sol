// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../../../contracts/Exchange.sol";
import "../../../contracts/Token.sol";
import "../../../contracts/test/MockV3Aggregator.sol";
import "./../helper.sol";

contract Users20 is Test {
    
    MockV3Aggregator public nftOracle;
    MockV3Aggregator public ethPriceOracle;
    Token public usdc;

    Exchange public exchange;
    Helper public helper;

    address add1 = vm.addr(1);
    address add2 = vm.addr(2);
    address add3 = vm.addr(3);
    address add4 = vm.addr(4);
    address add5 = vm.addr(5);
    address add6 = vm.addr(6);
    address add7 = vm.addr(7);
    address add8 = vm.addr(8);
    address add9 = vm.addr(9);
    address add10 = vm.addr(10);
    address add11 = vm.addr(11);
    address add12 = vm.addr(12);
    address add13 = vm.addr(13);
    address add14 = vm.addr(14);
    address add15 = vm.addr(15);
    address add16 = vm.addr(16);
    address add17 = vm.addr(17);
    address add18 = vm.addr(18);
    address add19 = vm.addr(19);
    address add20 = vm.addr(20);

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
        exchange.initialVirtualPool(100e18);
        usdc.transfer(add1, 1000e18);
        usdc.transfer(add2, 1000e18);
        usdc.transfer(add3, 1000e18);
        usdc.transfer(add4, 1000e18);
        usdc.transfer(add5, 1000e18);
        usdc.transfer(add6, 1000e18);
        usdc.transfer(add7, 1000e18);
        usdc.transfer(add8, 1000e18);
        usdc.transfer(add9, 1000e18);
        usdc.transfer(add10, 1000e18);
        usdc.transfer(add11, 1000e18);
        usdc.transfer(add12, 1000e18);
        usdc.transfer(add13, 1000e18);
        usdc.transfer(add14, 1000e18);
        usdc.transfer(add15, 1000e18);
        usdc.transfer(add16, 1000e18);
        usdc.transfer(add17, 1000e18);
        usdc.transfer(add18, 1000e18);
        usdc.transfer(add19, 1000e18);
        usdc.transfer(add20, 1000e18);
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
       //user 2 open long postion
       vm.startPrank(add2);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add2)), 0);
       assertEq(exchange.collateral(address(usdc), address(add2)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 3 open short postion
       vm.startPrank(add3);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add3)), 0);
       assertEq(exchange.collateral(address(usdc), address(add3)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 4 open short postion
       vm.startPrank(add4);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add4)), 0);
       assertEq(exchange.collateral(address(usdc), address(add4)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 5 open long postion
       vm.startPrank(add5);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add5)), 0);
       assertEq(exchange.collateral(address(usdc), address(add5)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 6 open long postion
       vm.startPrank(add6);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add6)), 0);
       assertEq(exchange.collateral(address(usdc), address(add6)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 7 open long postion
       vm.startPrank(add7);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add7)), 0);
       assertEq(exchange.collateral(address(usdc), address(add7)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 8 open long postion
       vm.startPrank(add8);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add8)), 0);
       assertEq(exchange.collateral(address(usdc), address(add8)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 9 open long postion
       vm.startPrank(add9);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add9)), 0);
       assertEq(exchange.collateral(address(usdc), address(add9)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 10 open short postion
       vm.startPrank(add10);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add10)), 0);
       assertEq(exchange.collateral(address(usdc), address(add10)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 11 open long postion
       vm.startPrank(add11);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add11)), 0);
       assertEq(exchange.collateral(address(usdc), address(add11)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 12 open short postion
       vm.startPrank(add12);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add12)), 0);
       assertEq(exchange.collateral(address(usdc), address(add12)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 13 open short postion
       vm.startPrank(add13);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add13)), 0);
       assertEq(exchange.collateral(address(usdc), address(add13)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 14 open long postion
       vm.startPrank(add14);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add14)), 0);
       assertEq(exchange.collateral(address(usdc), address(add14)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 15 open long postion
       vm.startPrank(add15);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add15)), 0);
       assertEq(exchange.collateral(address(usdc), address(add15)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 16 open short postion
       vm.startPrank(add16);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add16)), 0);
       assertEq(exchange.collateral(address(usdc), address(add16)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 17 open long postion
       vm.startPrank(add17);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add17)), 0);
       assertEq(exchange.collateral(address(usdc), address(add17)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 18 open long postion
       vm.startPrank(add18);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add18)), 0);
       assertEq(exchange.collateral(address(usdc), address(add18)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 19 open long postion
       vm.startPrank(add19);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add19)), 0);
       assertEq(exchange.collateral(address(usdc), address(add19)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 20 open short postion
       vm.startPrank(add20);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add20)), 0);
       assertEq(exchange.collateral(address(usdc), address(add20)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();


       //user 1 close poition
       vm.startPrank(add1);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 2 close poition
       vm.startPrank(add2);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 3 close poition
       vm.startPrank(add3);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 4 close poition
       vm.startPrank(add4);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 5 close poition
       vm.startPrank(add5);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 6 close poition
       vm.startPrank(add6);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 7 close poition
       vm.startPrank(add7);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 8 close poition
       vm.startPrank(add8);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 9 close poition
       vm.startPrank(add9);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 11 close poition
       vm.startPrank(add11);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 12 close poition
       vm.startPrank(add12);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 13 close poition
       vm.startPrank(add13);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 14 close poition
       vm.startPrank(add14);
       exchange.closePositionComplete(0);
       vm.stopPrank();
       
       //user 15 close poition
       vm.startPrank(add15);
       exchange.closePositionComplete(0);
       vm.stopPrank();
       
       //user 16 close poition
       vm.startPrank(add16);
       exchange.closePositionComplete(0);
       vm.stopPrank();
       
       //user 17 close poition
       vm.startPrank(add17);
       exchange.closePositionComplete(0);
       vm.stopPrank();
       
       //user 18 close poition
       vm.startPrank(add18);
       exchange.closePositionComplete(0);
       vm.stopPrank();
       
       //user 19 close poition
       vm.startPrank(add19);
       exchange.closePositionComplete(0);
       vm.stopPrank();
       
       //user 20 close poition
       vm.startPrank(add20);
       exchange.closePositionComplete(0);
       vm.stopPrank();
    

    }

    
    
}
