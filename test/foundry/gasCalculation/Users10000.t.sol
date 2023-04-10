// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;
import "forge-std/Test.sol";
import "../../../contracts/Exchange.sol";
import "../../../contracts/Token.sol";
import "../../../contracts/test/MockV3Aggregator.sol";
import "./../helper.sol";

// 2, 20, 40, 60, 100, 1000

contract Users5000 is Test {
    
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
        ethPriceOracle = new MockV3Aggregator(18, 2500e18);
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

        // createUsers()
        // for(uint i=1; i <= 10000; i++){
        //     address add = vm.addr(i);
        //     users.push(add);
        // }

        // for(uint i; i < 10000; i++){
        //     usdc.transfer(users[i], 1000e18);
        // }

    }


    function testActions() public {
       console.log("start price 1", exchange.marketPrice());
        bool shouldBeLong = true;
        bool shouldBeShort = false;
        uint startPrice = exchange.marketPrice();
        for(uint i; i < 5000; i++) {
            console.log("Time :", i);
            //create and charge user
            address add = vm.addr(i+1);
            users.push(add);
            usdc.transfer(users[i], 1000e18);
            //start trading with the user
            vm.startPrank(users[i]);
            usdc.approve(address(exchange), 1000e18);
            exchange.depositCollateral(1000e18);
            assertEq(usdc.balanceOf(address(users[i])), 0);
            assertEq(exchange.collateral(address(usdc), address(users[i])), 1000e18);
            if(shouldBeShort == true){
                exchange.openShortPosition(1500e18, 0);
                if((startPrice - exchange.marketPrice())*100/startPrice >= 100){
                    shouldBeLong = true;
                    shouldBeShort = false;
                    startPrice = exchange.marketPrice();
                }
            }else if(shouldBeLong == true){
                exchange.openLongPosition(1500e18, 0);
                if((exchange.marketPrice() - startPrice)*100/startPrice >= 30){
                    shouldBeLong = false;
                    shouldBeShort = true;
                    startPrice = exchange.marketPrice();
                }
            }
            vm.stopPrank();
            
            //close poistions
            if( 4000 < i ) {
            vm.startPrank(users[i -1]);
            exchange.closePositionComplete(0);
            vm.stopPrank();
            }

        }
    
        // for(uint i; i < 10000; i++) {
        //     vm.startPrank(users[i]);
        //     exchange.closePositionComplete(0);
        //     vm.stopPrank();
        // }
        
    }

    
    
}
