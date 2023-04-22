// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../../../contracts/Exchange.sol";
import "../../../contracts/ExchangeInfo.sol";
import "../../../contracts/Token.sol";
import "../../../contracts/test/MockV3Aggregator.sol";
import "./../helper.sol";

// command: forge test --match-path test/foundry/gasCalculation/Users2.t.sol --contracts exchange

contract Users2 is Test {
    
    MockV3Aggregator public nftOracle;
    MockV3Aggregator public ethPriceOracle;
    Token public usdc;

    Exchange public exchange;
    ExchangeInfo public exchangeInfo;
    Helper public helper;

    address add1 = vm.addr(1);
    address add2 = vm.addr(2);

    function setUp() public {
        usdc = new Token(1000000e18);
        nftOracle = new MockV3Aggregator(18, 1e18);
        ethPriceOracle = new MockV3Aggregator(18, 1300e18);
        exchange = new Exchange(
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
        exchange.initialVirtualPool(1e18);
        usdc.transfer(add1, 1000e18);
        usdc.transfer(add2, 1000e18);
    }


    function testActions() public {
        //user 1 open 1000 usd long postion
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       (address[] memory hardLiquidateUsers, address[] memory partialLiquidateUsers) = exchangeInfo.openLongLiquidateList(1000e18);
       exchange.openLongPosition(1000e18, 0, hardLiquidateUsers, partialLiquidateUsers);
        vm.stopPrank();
       //user 2 open 500 usd long postion
       vm.startPrank(add2);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add2)), 0);
       assertEq(exchange.collateral(address(usdc), address(add2)), 1000e18);
       (hardLiquidateUsers, partialLiquidateUsers) = exchangeInfo.openShortLiquidateList(1600e18);
       consoleLiquidateList(hardLiquidateUsers, partialLiquidateUsers);
       exchange.openShortPosition(1600e18, 0, hardLiquidateUsers, partialLiquidateUsers);
        vm.stopPrank();
       //user 1 close poition
       vm.startPrank(add1);
       (hardLiquidateUsers, partialLiquidateUsers) = exchangeInfo.closeLongLiquidateList(exchange.positive(exchange.uservBaycBalance(add1)));
       consoleLiquidateList(hardLiquidateUsers, partialLiquidateUsers);
       exchange.closePositionComplete(0, hardLiquidateUsers, partialLiquidateUsers);
       vm.stopPrank();
       //user 1 close poition
       vm.startPrank(add2);
       (hardLiquidateUsers, partialLiquidateUsers) = exchangeInfo.closeShortLiquidateList(exchange.positive(exchange.uservBaycBalance(add1)));
       exchange.closePositionComplete(0, hardLiquidateUsers, partialLiquidateUsers);
       vm.stopPrank();
       //funding fee
       exchange.setFundingRate();
    }


    

    function consoleLiquidateList(address[] memory hardLiquidateUsers, address[] memory partialLiquidateUsers) public {
          for(uint i; i < hardLiquidateUsers.length; i++){
            console.log("hard liquidate user ", i,  ":",  hardLiquidateUsers[i]);
          }
          for(uint i; i < partialLiquidateUsers.length; i++){
            console.log("partial liquidate user ", i,  ":",  partialLiquidateUsers[i]);
          } 
    }

    
    
}