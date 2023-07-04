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

contract Positions is Test, ExchangeDeployer {
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
        usdc.transfer(add3, 1000e18);
        usdc.transfer(add4, 1000e18);
        usdc.transfer(add5, 1000e18);
    }


    function testAddAndWithdrawCollateral() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startvUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       exchange.withdrawCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 1000e18);
       assertEq(exchange.collateral(address(usdc), address(add1)), 0);
       uint endvAssetPoolSize = exchange.vAssetPoolSize();
       uint endvUsdPoolSize = exchange.vUsdPoolSize();
       assertEq(startvAssetPoolSize, endvAssetPoolSize);
       assertEq(startvUsdPoolSize, endvUsdPoolSize);
       
    }

    
    function testOpenAndClosePosition() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       exchange.openLongPosition(1000e18, 0);
       uint AssetValue = exchange.getShortVusdAmountOut(exchange.positive(exchange.uservAssetBalance(add1)));
       
       int AssetBalance = exchange.uservUsdBalance(add1);
    
       uint middlevAssetPoolSize = exchange.vAssetPoolSize();
       exchange.closePositionComplete(0);
       uint endCollateral = exchange.collateral(address(usdc), address(add1));
       uint endvAssetPoolSize = exchange.vAssetPoolSize();
       uint endUsdPoolSize = exchange.vUsdPoolSize();
       uint endExchangeBalance = usdc.balanceOf(address(exchange));
       
       assertEq(startvAssetPoolSize, endvAssetPoolSize);

       
    }
    
    
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
       uint newUsdValue = helper.getShortVusdAmountOut(uint(exchange.uservAssetBalance(add1)));
       int pnl =  int(newUsdValue) - (-exchange.uservUsdBalance(add1));
       assertEq(exchange.getPNL(add1), pnl);
       uint lastCollateral = exchange.collateral(address(usdc), add1);
       uint lastPositionValue = exchange.getShortVusdAmountOut(uint(exchange.uservAssetBalance(add1)));
       exchange.closePositionComplete(0);
        /*
       */
    }
    
}