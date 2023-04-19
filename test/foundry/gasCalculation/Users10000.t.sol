// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;
import "forge-std/Test.sol";
import "../../../contracts/Exchange.sol";
import "../../../contracts/Token.sol";
import "../../../contracts/test/MockV3Aggregator.sol";
import "./../helper.sol";

// 2, 20, 40, 60, 100, 1000

contract Users10000 is Test {
    
    MockV3Aggregator public nftOracle;
    MockV3Aggregator public ethPriceOracle;
    Token public usdc;

    Exchange public exchange;
    Helper public helper;

    address add1 = vm.addr(1);
    address add2 = vm.addr(2);

    address[] users;



    function setUp() public {
        usdc = new Token(2000000000e18);
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

        exchange.initialVirtualPool(10000e18);

        
        for(uint i=1; i <= 10000; i++){
            address add = vm.addr(i);
            usdc.transfer(add, 1000e18);
            users.push(add);
        }

    }


    function testActions() public {
        bool shouldBeLong = true;
        bool shouldBeShort = false;
        uint startPrice = exchange.marketPrice();
        for(uint i; i < 10000; i++) {
            vm.startPrank(users[i]);
            usdc.approve(address(exchange), 1000e18);
            exchange.depositCollateral(1000e18);
            assertEq(usdc.balanceOf(address(users[i])), 0);
            assertEq(exchange.collateral(address(usdc), address(users[i])), 1000e18);
            if(shouldBeShort == true){
                exchange.openShortPosition(1500e18, 0);
                if(startPrice > exchange.marketPrice() && (startPrice - exchange.marketPrice())*100/startPrice >= 50){
                    shouldBeLong = true;
                    shouldBeShort = false;
                    // startPrice = exchange.marketPrice();
                }
            }else if(shouldBeLong == true){
                exchange.openLongPosition(1500e18, 0);
                if(startPrice < exchange.marketPrice() &&(exchange.marketPrice() - startPrice)*100/startPrice >= 50){
                    shouldBeLong = false;
                    shouldBeShort = true;
                    // startPrice = exchange.marketPrice();
                }
            }
            console.log("exchange market price", exchange.marketPrice()/1e18);
            vm.stopPrank();
            //funding fee
            exchange.setFundingRate();
        }

        

        
        for(uint i; i < 10000; i++) {
            console.log("***");
            console.log("index", i);
            console.log("user margin", exchange.positive(exchange.userMargin(users[i])));
            console.log("bayc balance", exchange.positive(exchange.uservBaycBalance(users[i]))/1e16);
            console.log("usd balance", exchange.positive(exchange.uservUsdBalance(users[i]))/1e16);
            // console.log("usd poolsize", (exchange.vUsdPoolSize())/1e16);
            console.log("***");
            vm.startPrank(users[i]);
            exchange.closePositionComplete(0);
            vm.stopPrank();
        }

        
        
    }

    
    
}
