// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;
import "forge-std/Test.sol";
import "../../../contracts/Exchange.sol";
import "../../../contracts/Token.sol";
import "../../../contracts/test/MockV3Aggregator.sol";
import "./../helper.sol";

// 2, 20, 40, 60, 100, 1000

contract Users60 is Test {
    
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
    address add21 = vm.addr(21);
    address add22 = vm.addr(22);
    address add23 = vm.addr(23);
    address add24 = vm.addr(24);
    address add25 = vm.addr(25);
    address add26 = vm.addr(26);
    address add27 = vm.addr(27);
    address add28 = vm.addr(28);
    address add29 = vm.addr(29);
    address add30 = vm.addr(30);
    address add31 = vm.addr(31);
    address add32 = vm.addr(32);
    address add33 = vm.addr(33);
    address add34 = vm.addr(34);
    address add35 = vm.addr(35);
    address add36 = vm.addr(36);
    address add37 = vm.addr(37);
    address add38 = vm.addr(38);
    address add39 = vm.addr(39);
    address add40 = vm.addr(40);
    address add41 = vm.addr(41);
    address add42 = vm.addr(42);
    address add43 = vm.addr(43);
    address add44 = vm.addr(44);
    address add45 = vm.addr(45);
    address add46 = vm.addr(46);
    address add47 = vm.addr(47);
    address add48 = vm.addr(48);
    address add49 = vm.addr(49);
    address add50 = vm.addr(50);
    address add51 = vm.addr(51);
    address add52 = vm.addr(52);
    address add53 = vm.addr(53);
    address add54 = vm.addr(54);
    address add55 = vm.addr(55);
    address add56 = vm.addr(56);
    address add57 = vm.addr(57);
    address add58 = vm.addr(58);
    address add59 = vm.addr(59);
    address add60 = vm.addr(60);
    

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
        exchange.initialVirtualPool(1000e18);
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
        usdc.transfer(add21, 1000e18);
        usdc.transfer(add22, 1000e18);
        usdc.transfer(add23, 1000e18);
        usdc.transfer(add24, 1000e18);
        usdc.transfer(add25, 1000e18);
        usdc.transfer(add26, 1000e18);
        usdc.transfer(add27, 1000e18);
        usdc.transfer(add28, 1000e18);
        usdc.transfer(add29, 1000e18);
        usdc.transfer(add30, 1000e18);
        usdc.transfer(add31, 1000e18);
        usdc.transfer(add32, 1000e18);
        usdc.transfer(add33, 1000e18);
        usdc.transfer(add34, 1000e18);
        usdc.transfer(add35, 1000e18);
        usdc.transfer(add36, 1000e18);
        usdc.transfer(add37, 1000e18);
        usdc.transfer(add38, 1000e18);
        usdc.transfer(add39, 1000e18);
        usdc.transfer(add40, 1000e18);
        usdc.transfer(add41, 1000e18);
        usdc.transfer(add42, 1000e18);
        usdc.transfer(add43, 1000e18);
        usdc.transfer(add44, 1000e18);
        usdc.transfer(add45, 1000e18);
        usdc.transfer(add46, 1000e18);
        usdc.transfer(add47, 1000e18);
        usdc.transfer(add48, 1000e18);
        usdc.transfer(add49, 1000e18);
        usdc.transfer(add50, 1000e18);
        usdc.transfer(add51, 1000e18);
        usdc.transfer(add52, 1000e18);
        usdc.transfer(add53, 1000e18);
        usdc.transfer(add54, 1000e18);
        usdc.transfer(add55, 1000e18);
        usdc.transfer(add56, 1000e18);
        usdc.transfer(add57, 1000e18);
        usdc.transfer(add58, 1000e18);
        usdc.transfer(add59, 1000e18);
        usdc.transfer(add60, 1000e18);
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

        //funding fee
       exchange.setFundingRate();

       //user 21 open short postion
       vm.startPrank(add21);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add21)), 0);
       assertEq(exchange.collateral(address(usdc), address(add21)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 22 open short postion
       vm.startPrank(add22);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add22)), 0);
       assertEq(exchange.collateral(address(usdc), address(add22)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 23 open short postion
       vm.startPrank(add23);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add23)), 0);
       assertEq(exchange.collateral(address(usdc), address(add23)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 24 open short postion
       vm.startPrank(add24);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add24)), 0);
       assertEq(exchange.collateral(address(usdc), address(add24)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 25 open short postion
       vm.startPrank(add25);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add25)), 0);
       assertEq(exchange.collateral(address(usdc), address(add25)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 26 open short postion
       vm.startPrank(add26);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add26)), 0);
       assertEq(exchange.collateral(address(usdc), address(add26)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 27 open short postion
       vm.startPrank(add27);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add27)), 0);
       assertEq(exchange.collateral(address(usdc), address(add27)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 28 open short postion
       vm.startPrank(add28);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add28)), 0);
       assertEq(exchange.collateral(address(usdc), address(add28)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 29 open short postion
       vm.startPrank(add29);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add29)), 0);
       assertEq(exchange.collateral(address(usdc), address(add29)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 30 open short postion
       vm.startPrank(add30);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add30)), 0);
       assertEq(exchange.collateral(address(usdc), address(add30)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 31 open short postion
       vm.startPrank(add31);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add31)), 0);
       assertEq(exchange.collateral(address(usdc), address(add31)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 32 open short postion
       vm.startPrank(add32);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add32)), 0);
       assertEq(exchange.collateral(address(usdc), address(add32)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 33 open short postion
       vm.startPrank(add33);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add33)), 0);
       assertEq(exchange.collateral(address(usdc), address(add33)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 34 open short postion
       vm.startPrank(add34);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add34)), 0);
       assertEq(exchange.collateral(address(usdc), address(add34)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 35 open short postion
       vm.startPrank(add35);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add35)), 0);
       assertEq(exchange.collateral(address(usdc), address(add35)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 36 open short postion
       vm.startPrank(add36);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add36)), 0);
       assertEq(exchange.collateral(address(usdc), address(add36)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 37 open short postion
       vm.startPrank(add37);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add37)), 0);
       assertEq(exchange.collateral(address(usdc), address(add37)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 38 open short postion
       vm.startPrank(add38);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add38)), 0);
       assertEq(exchange.collateral(address(usdc), address(add38)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 39 open short postion
       vm.startPrank(add39);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add39)), 0);
       assertEq(exchange.collateral(address(usdc), address(add39)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 40 open short postion
       vm.startPrank(add40);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add40)), 0);
       assertEq(exchange.collateral(address(usdc), address(add40)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();

        //funding fee
       exchange.setFundingRate();

       //user 41 open short postion
       vm.startPrank(add41);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add41)), 0);
       assertEq(exchange.collateral(address(usdc), address(add41)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 42 open long postion
       vm.startPrank(add42);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add42)), 0);
       assertEq(exchange.collateral(address(usdc), address(add42)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 43 open short postion
       vm.startPrank(add43);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add43)), 0);
       assertEq(exchange.collateral(address(usdc), address(add43)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 44 open long postion
       vm.startPrank(add44);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add44)), 0);
       assertEq(exchange.collateral(address(usdc), address(add44)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 45 open long postion
       vm.startPrank(add45);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add45)), 0);
       assertEq(exchange.collateral(address(usdc), address(add45)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 46 open short postion
       vm.startPrank(add46);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add46)), 0);
       assertEq(exchange.collateral(address(usdc), address(add46)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 47 open long postion
       vm.startPrank(add47);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add47)), 0);
       assertEq(exchange.collateral(address(usdc), address(add47)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 48 open short postion
       vm.startPrank(add48);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add48)), 0);
       assertEq(exchange.collateral(address(usdc), address(add48)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 49 open long postion
       vm.startPrank(add49);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add49)), 0);
       assertEq(exchange.collateral(address(usdc), address(add49)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 50 open short postion
       vm.startPrank(add50);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add50)), 0);
       assertEq(exchange.collateral(address(usdc), address(add50)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 51 open short postion
       vm.startPrank(add51);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add51)), 0);
       assertEq(exchange.collateral(address(usdc), address(add51)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 52 open long postion
       vm.startPrank(add52);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add52)), 0);
       assertEq(exchange.collateral(address(usdc), address(add52)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 53 open short postion
       vm.startPrank(add53);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add53)), 0);
       assertEq(exchange.collateral(address(usdc), address(add53)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 54 open long postion
       vm.startPrank(add54);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add54)), 0);
       assertEq(exchange.collateral(address(usdc), address(add54)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 55 open long postion
       vm.startPrank(add55);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add55)), 0);
       assertEq(exchange.collateral(address(usdc), address(add55)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 56 open short postion
       vm.startPrank(add56);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add56)), 0);
       assertEq(exchange.collateral(address(usdc), address(add56)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 57 open short postion
       vm.startPrank(add57);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add57)), 0);
       assertEq(exchange.collateral(address(usdc), address(add57)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
       //user 58 open long postion
       vm.startPrank(add58);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add58)), 0);
       assertEq(exchange.collateral(address(usdc), address(add58)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 59 open long postion
       vm.startPrank(add59);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add59)), 0);
       assertEq(exchange.collateral(address(usdc), address(add59)), 1000e18);
       exchange.openLongPosition(1600e18, 0);
        vm.stopPrank();
       //user 60 open short postion
       vm.startPrank(add60);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add60)), 0);
       assertEq(exchange.collateral(address(usdc), address(add60)), 1000e18);
       exchange.openShortPosition(1600e18, 0);
        vm.stopPrank();
    
        //funding fee
       exchange.setFundingRate();


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
       
       //user 21 close poition
       vm.startPrank(add21);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 22 close poition
       vm.startPrank(add22);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 23 close poition
       vm.startPrank(add23);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 24 close poition
       vm.startPrank(add24);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 25 close poition
       vm.startPrank(add25);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 26 close poition
       vm.startPrank(add26);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 27 close poition
       vm.startPrank(add27);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 28 close poition
       vm.startPrank(add28);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 29 close poition
       vm.startPrank(add29);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 30 close poition
       vm.startPrank(add30);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 31 close poition
       vm.startPrank(add31);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 32 close poition
       vm.startPrank(add32);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 33 close poition
       vm.startPrank(add33);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 34 close poition
       vm.startPrank(add34);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 35 close poition
       vm.startPrank(add35);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 36 close poition
       vm.startPrank(add36);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 37 close poition
       vm.startPrank(add37);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 38 close poition
       vm.startPrank(add38);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 39 close poition
       vm.startPrank(add39);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 40 close poition
       vm.startPrank(add40);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 41 close poition
       vm.startPrank(add41);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 42 close poition
       vm.startPrank(add42);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 43 close poition
       vm.startPrank(add43);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 44 close poition
       vm.startPrank(add44);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 45 close poition
       vm.startPrank(add45);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 46 close poition
       vm.startPrank(add46);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 47 close poition
       vm.startPrank(add47);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 48 close poition
       vm.startPrank(add48);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 49 close poition
       vm.startPrank(add49);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 50 close poition
       vm.startPrank(add50);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 51 close poition
       vm.startPrank(add51);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 52 close poition
       vm.startPrank(add52);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 53 close poition
       vm.startPrank(add53);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 54 close poition
       vm.startPrank(add54);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 55 close poition
       vm.startPrank(add55);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 56 close poition
       vm.startPrank(add56);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 57 close poition
       vm.startPrank(add57);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 58 close poition
       vm.startPrank(add58);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 59 close poition
       vm.startPrank(add59);
       exchange.closePositionComplete(0);
       vm.stopPrank();

       //user 60 close poition
       vm.startPrank(add60);
       exchange.closePositionComplete(0);
       vm.stopPrank();

    }

    
    
}
