// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../contracts/Exchange.sol";
import "../../contracts/Token.sol";
import "../../contracts/test/MockV3AggregatorV8.sol";

contract Positions is Test {
    Exchange public exchange;
    
    Token public usdc;
    MockV3Aggregator public nftOracle;
    MockV3Aggregator public ethPriceOracle;

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

        usdc.transfer(add1, 1000e18);
        usdc.transfer(add2, 1000e18);
        usdc.transfer(add3, 1000e18);
        usdc.transfer(add4, 1000e18);
        usdc.transfer(add5, 1000e18);
    }

    function testAddAndWithdrawCollateral() public {
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       exchange.withdrawCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 1000e18);
       assertEq(exchange.collateral(address(usdc), address(add1)), 0);
    }

    function testOpenAndClosePosition() public {
        vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       exchange.openLongPosition(1000e18, 0);
       exchange.closePositionComplete(0);
    }
    
}
