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

contract MaxPositionAmount is Test, ExchangeDeployer {
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



    function testMaxAmountForLongWithNoBalance() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);
       
       
      uint k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       //  int accountValue = exchange.getAccountValue(address(add1));
       uint collateral = exchange.collateral(address(usdc), address(add1));
       int vCollateral = exchange.virtualCollateral(address(add1));
       uint usdPool = exchange.vUsdPoolSize();
       uint baycPool = exchange.vAssetPoolSize();
       int usdB = exchange.uservUsdBalance(address(add1));
       int baycB = exchange.uservAssetBalance(address(add1));
       
       int newUsdPool = int(k)/(int(baycPool) + helper.absoluteInt(baycB));
      //  int x = (100*(int(collateral) + vCollateral - 160*int(usdPool)/100 + 160*newUsdPool/100 + helper.absoluteInt(usdB)))/60;
       int x = (100*(int(collateral) + vCollateral + 40*int(usdPool)/100 - 40*newUsdPool/100 + (usdB)))/60;

       //
      //  int x =(int(collateral) + vCollateral)*100/60; 

       //new pools
       k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() + uint(x);
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;

       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
       console.logInt(isG);
       
      //  //get new margin
      //  //check minimum amount
      //  uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
      //  uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - uint(newPositionNotional);
      //  uint256 newvAssetPoolSize = k / newvUsdPoolSize;
      //  int isG = exchange._newMargin(
      //   address(add1),
      //   newvAssetPoolSize,
      //   newvUsdPoolSize
      //  );
      //  console.logInt(isG);

    //    vm.expectRevert("Insufficient margin to open position with requested size.");
    //    exchange.openLongPosition(uint(newPositionNotional+1), 0);
       
      //  exchange.openLongPosition(uint(newPositionNotional), 0);
      //  console.logInt(exchange.userMargin(add1));
      //  **/
    }


    function testMaxAmountForLongWithLongBalance() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);
       
       exchange.openLongPosition(1000e18, 0);
       
      uint k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       //  int accountValue = exchange.getAccountValue(address(add1));
       uint collateral = exchange.collateral(address(usdc), address(add1));
       int vCollateral = exchange.virtualCollateral(address(add1));
       uint usdPool = exchange.vUsdPoolSize();
       uint baycPool = exchange.vAssetPoolSize();
       int usdB = exchange.uservUsdBalance(address(add1));
       int baycB = exchange.uservAssetBalance(address(add1));
       
       int newUsdPool = int(k)/(int(baycPool) + (baycB));
      //  int x = (100*(int(collateral) + vCollateral - 160*int(usdPool)/100 + 160*newUsdPool/100 - (usdB)))/60;
       int x = (100*(int(collateral) + vCollateral + 40*int(usdPool)/100 - 40*newUsdPool/100 + (usdB)))/60;

       //
      //  int x =(int(collateral) + vCollateral)*100/60; 

       //new pools
       k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() + uint(x);
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;

       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
       console.logInt(isG);
       
      //  //get new margin
      //  //check minimum amount
      //  uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
      //  uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - uint(newPositionNotional);
      //  uint256 newvAssetPoolSize = k / newvUsdPoolSize;
      //  int isG = exchange._newMargin(
      //   address(add1),
      //   newvAssetPoolSize,
      //   newvUsdPoolSize
      //  );
      //  console.logInt(isG);

    //    vm.expectRevert("Insufficient margin to open position with requested size.");
    //    exchange.openLongPosition(uint(newPositionNotional+1), 0);
       
      //  exchange.openLongPosition(uint(newPositionNotional), 0);
      //  console.logInt(exchange.userMargin(add1));
      //  **/
    }

    function testMaxAmountForLongWithShortBalance() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);
       
       exchange.openShortPosition(1000e18, 0);
       
      uint k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       //  int accountValue = exchange.getAccountValue(address(add1));
       uint collateral = exchange.collateral(address(usdc), address(add1));
       int vCollateral = exchange.virtualCollateral(address(add1));
       uint usdPool = exchange.vUsdPoolSize();
       uint baycPool = exchange.vAssetPoolSize();
       int usdB = exchange.uservUsdBalance(address(add1));
       int baycB = exchange.uservAssetBalance(address(add1));
       
       int newUsdPool = int(k)/(int(baycPool) + (baycB));
      //  console.logInt(usdB);
      //  int x = (100*(int(collateral) + vCollateral - 160*int(usdPool)/100 + 160*newUsdPool/100 - (usdB)))/60;
       int x = (100*(int(collateral) + vCollateral + 40*int(usdPool)/100 - 40*newUsdPool/100 + (usdB)))/60;

       //
      //  int x =(int(collateral) + vCollateral)*100/60; 

       //new pools
       k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() + uint(x);
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;

       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
      //  console.logInt(x/1e18);
       console.logInt(isG);
      //  console.log("open long position:");
      //  console.logInt(exchange.uservUsdBalance(address(add1)));
      //  console.logInt(exchange.userMargin(address(add1)));
       exchange.openLongPosition(uint(x), 0);
      //  console.logInt(exchange.uservUsdBalance(address(add1)));
      //  console.logInt(exchange.userMargin(address(add1)));
       
      //  //get new margin
      //  //check minimum amount
      //  uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
      //  uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - uint(newPositionNotional);
      //  uint256 newvAssetPoolSize = k / newvUsdPoolSize;
      //  int isG = exchange._newMargin(
      //   address(add1),
      //   newvAssetPoolSize,
      //   newvUsdPoolSize
      //  );
      //  console.logInt(isG);

    //    vm.expectRevert("Insufficient margin to open position with requested size.");
    //    exchange.openLongPosition(uint(newPositionNotional+1), 0);
       
      //  exchange.openLongPosition(uint(newPositionNotional), 0);
      //  console.logInt(exchange.userMargin(add1));
      //  **/
    }


    function testMaxAmountForLongWithShortBalanceWithPNL() public {
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);
       
       
       exchange.openShortPosition(1000e18, 0);
       vm.stopPrank();

       vm.startPrank(add2);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add2)), 0);
       exchange.openLongPosition(1000e18, 0);
       vm.stopPrank();
       
       vm.startPrank(add1);
       uint k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       //  int accountValue = exchange.getAccountValue(address(add1));
       uint collateral = exchange.collateral(address(usdc), address(add1));
       int vCollateral = exchange.virtualCollateral(address(add1));
       uint usdPool = exchange.vUsdPoolSize();
       uint baycPool = exchange.vAssetPoolSize();
       int usdB = exchange.uservUsdBalance(address(add1));
       int baycB = exchange.uservAssetBalance(address(add1));
       
       int newUsdPool = int(k)/(int(baycPool) + (baycB));
      //  console.logInt(usdB);
      //  int x = (100*(int(collateral) + vCollateral - 160*int(usdPool)/100 + 160*newUsdPool/100 - (usdB)))/60;
       int x = (100*(int(collateral) + vCollateral + 40*int(usdPool)/100 - 40*newUsdPool/100 + (usdB)))/60;
      
       //new pools
       k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() + uint(x);
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;
       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
      //  int isG = exchange._newMargin2(
      //   address(add1),
      //   newvAssetPoolSize,
      //   newvUsdPoolSize
      //  );
      //  console.logInt(x/1e18);
       console.logInt(isG);
       

      // calculate new positionValue
      // int newUsdB = usdB - 723e18;
      // int pValue = int(usdPool) + 723e18 - int(k)/(int(baycPool) + baycB);
      // int y = 60*(pValue)/100 - int(collateral) - vCollateral;
      // int aValue = int(collateral) + vCollateral - pValue - newUsdB;
      // console.logInt(newUsdB);
      // console.logInt(pValue);
      // console.logInt( - pValue - newUsdB);
      // console.logInt(y);
      //  exchange.openLongPosition(uint(x), 0);

      //  console.logInt(exchange.liquidatedUser());
      //  console.log(address(add2));
      //  console.logInt(exchange.userMargin(address(add1)));
      //  console.logInt(exchange.userMargin(address(add2)));
      //  console.logInt(exchange.getPNL(address(add1)));
      //  console.log(exchange.getPositionNotional(address(add1)));
      //  console.logInt(exchange.getAccountValue(address(add1)));
      //  console.logInt(exchange.uservUsdBalance(address(add1)));
      //  console.logInt(exchange.uservAssetBalance(address(add1)));
      //  console.log(newvAssetPoolSize);
      //  console.log(exchange.vAssetPoolSize());
       
      //  //get new margin
      //  //check minimum amount
      //  uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
      //  uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - uint(newPositionNotional);
      //  uint256 newvAssetPoolSize = k / newvUsdPoolSize;
      //  int isG = exchange._newMargin(
      //   address(add1),
      //   newvAssetPoolSize,
      //   newvUsdPoolSize
      //  );
      //  console.logInt(isG);

    //    vm.expectRevert("Insufficient margin to open position with requested size.");
    //    exchange.openLongPosition(uint(newPositionNotional+1), 0);
       
      //  exchange.openLongPosition(uint(newPositionNotional), 0);
      //  console.logInt(exchange.userMargin(add1));
      //  **/
    }

    function testMaxAmountForShortWithNoBalance() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);

       uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       //  int accountValue = exchange.getAccountValue(address(add1));
       uint collateral = exchange.collateral(address(usdc), address(add1));
       int vCollateral = exchange.virtualCollateral(address(add1));
       uint usdPool = exchange.vUsdPoolSize();
       uint baycPool = exchange.vAssetPoolSize();
       int usdB = exchange.uservUsdBalance(address(add1));
       int baycB = exchange.uservAssetBalance(address(add1));
       
       int newUsdPool = int(k)/(int(baycPool) + (baycB));
      //  int x = (100*(int(collateral) + vCollateral - 40*int(usdPool)/100 + 40*newUsdPool/100 - (usdB)))/60;
       int x = (100*(int(collateral) + vCollateral + 160*int(usdPool)/100 - 160*newUsdPool/100 + (usdB)))/60;

       //
      //  int x =(int(collateral) + vCollateral)*100/60; 

       //new pools
       k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - uint(x);
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;

       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
       console.logInt(isG);

    }

    function testMaxAmountForShortWithShortBalance() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);

       exchange.openShortPosition(1000e18, 0);
       
       uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       //  int accountValue = exchange.getAccountValue(address(add1));
       uint collateral = exchange.collateral(address(usdc), address(add1));
       int vCollateral = exchange.virtualCollateral(address(add1));
       uint usdPool = exchange.vUsdPoolSize();
       uint baycPool = exchange.vAssetPoolSize();
       int usdB = exchange.uservUsdBalance(address(add1));
       int baycB = exchange.uservAssetBalance(address(add1));
       
       int newUsdPool = int(k)/(int(baycPool) + (baycB));
      //  int x = (100*(int(collateral) + vCollateral - 40*int(usdPool)/100 + 40*newUsdPool/100 - (usdB)))/60;
       int x = (100*(int(collateral) + vCollateral + 160*int(usdPool)/100 - 160*newUsdPool/100 + (usdB)))/60;

       //
      //  int x =(int(collateral) + vCollateral)*100/60; 

       //new pools
       k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - uint(x);
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;

       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
       console.logInt(isG);

    }

    function testMaxAmountForShortWithLongBalance() public {
       uint startvAssetPoolSize = exchange.vAssetPoolSize();
       uint startUsdPoolSize = exchange.vUsdPoolSize();
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       uint startExchangeBalance = usdc.balanceOf(address(exchange));
       uint firstCollateral = exchange.collateral(address(usdc), address(add1));
       assertEq(usdc.balanceOf(address(add1)), 0);

       exchange.openLongPosition(1000e18, 0);
       
       uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       //  int accountValue = exchange.getAccountValue(address(add1));
       uint collateral = exchange.collateral(address(usdc), address(add1));
       int vCollateral = exchange.virtualCollateral(address(add1));
       uint usdPool = exchange.vUsdPoolSize();
       uint baycPool = exchange.vAssetPoolSize();
       int usdB = exchange.uservUsdBalance(address(add1));
       int baycB = exchange.uservAssetBalance(address(add1));
       
       int newUsdPool = int(k)/(int(baycPool) + (baycB));
      //  int x = (100*(int(collateral) + vCollateral - 40*int(usdPool)/100 + 40*newUsdPool/100 - (usdB)))/60;
       int x = (100*(int(collateral) + vCollateral + 160*int(usdPool)/100 - 160*newUsdPool/100 + (usdB)))/60;

       //
       //  int x =(int(collateral) + vCollateral)*100/60; 

       //new pools
       k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - uint(x);
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;

       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
       console.logInt(isG);

    }


    function testMaxAmountForShortWithLongBalancePNL() public {
       vm.startPrank(add1);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add1)), 0);

       exchange.openLongPosition(1000e18, 0);
       vm.stopPrank();

       vm.startPrank(add2);
       usdc.approve(address(exchange), 1000e18);
       exchange.depositCollateral(1000e18);
       assertEq(usdc.balanceOf(address(add2)), 0);
       exchange.openLongPosition(1000e18, 0);
       vm.stopPrank();
       
       vm.startPrank(add1);
       
       uint256 k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       //  int accountValue = exchange.getAccountValue(address(add1));
       uint collateral = exchange.collateral(address(usdc), address(add1));
       int vCollateral = exchange.virtualCollateral(address(add1));
       uint usdPool = exchange.vUsdPoolSize();
       uint baycPool = exchange.vAssetPoolSize();
       int usdB = exchange.uservUsdBalance(address(add1));
       int baycB = exchange.uservAssetBalance(address(add1));
       
       int newUsdPool = int(k)/(int(baycPool) + (baycB));
      //  int x = (100*(int(collateral) + vCollateral - 40*int(usdPool)/100 + 40*newUsdPool/100 - (usdB)))/60;
       int x = (100*(int(collateral) + vCollateral + 160*int(usdPool)/100 - 160*newUsdPool/100 + (usdB)))/60;
       //
       //  int x =(int(collateral) + vCollateral)*100/60; 

       //new pools
       k = exchange.vAssetPoolSize() * exchange.vUsdPoolSize();
       uint256 newvUsdPoolSize = exchange.vUsdPoolSize() - uint(x);
       uint256 newvAssetPoolSize = k / newvUsdPoolSize;

       int isG = exchange._newMargin(
        address(add1),
        newvAssetPoolSize,
        newvUsdPoolSize
       );
       console.logInt(isG);

    }

    /*
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
    **/
    
    
    
}