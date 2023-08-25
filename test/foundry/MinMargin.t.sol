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

contract MinMargin is Test, ExchangeDeployer {
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



    function testMinAmountForLong() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);
       
       int accountValue = exchange.getAccountValue(address(add1));
       int newPositionNotional = accountValue*100/61;

       
       //get new margin
       //check minimum amount
       uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - uint(newPositionNotional);
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;
       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
       console.logInt(isG);

    //    vm.expectRevert("Insufficient margin to open position with requested size.");
    //    exchange.openLongPosition(uint(newPositionNotional+1), 0);
       
       exchange.openLongPosition(uint(newPositionNotional), 0);
       console.logInt(exchange.userMargin(add1));
    }


    function testMinAmountForShort() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);

       int accountValue = exchange.getAccountValue(address(add1));
       int newPositionNotional = accountValue*100/61;
       
       //check minimum amount
       uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - uint(newPositionNotional);
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;
       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
       console.logInt(isG);

       exchange.openShortPosition(uint(newPositionNotional), 0);
       console.logInt(exchange.userMargin(add1));

    }

    
    function testOpenAndCloseLongPosition() public {
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

       //check minimum amount
       uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - 2630e18;
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;


       //test
       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
       console.logInt(isG);

       exchange.openShortPosition(2630e18, 0);
       console.logInt(exchange.userMargin(add1));
       
    }

    function testOpenAndCloseShortPosition() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);
       assertEq(exchange.collateral(address(usdc), address(add1)), 1000e18);
       exchange.openShortPosition(1000e18, 0);

        //check minimum amount
       uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() + 2630e18;
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;


       //test
       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
       console.logInt(isG);


       exchange.openLongPosition(2630e18, 0);
    
       console.logInt(exchange.userMargin(add1));
       
    }

    
    
    
}