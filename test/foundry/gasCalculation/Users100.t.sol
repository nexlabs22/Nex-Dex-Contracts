// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;
import "forge-std/Test.sol";
import "../ExchangeDeployer.sol";
import "../../../contracts/Exchange.sol";
import "../../../contracts/ExchangeInfo.sol";
import "../../../contracts/test/LinkToken.sol";
import "../../../contracts/test/MockApiOracle.sol";
import "../../../contracts/Token.sol";
import "../../../contracts/test/MockV3Aggregator.sol";
import "./../helper.sol";

// 2, 20, 40, 60, 100, 1000

contract Users100 is Test, ExchangeDeployer {
    
    MockV3Aggregator public nftOracle;
    MockV3Aggregator public ethPriceOracle;
    Token public usdc;

    Exchange public exchange;
    ExchangeInfo public exchangeInfo;
    LinkToken public link;
    MockApiOracle public oracle;
    Helper public helper;

    address add1 = vm.addr(1);
    address add2 = vm.addr(2);

    address[] users;



    function setUp() public {
        usdc = new Token(2000000000e18);
        nftOracle = new MockV3Aggregator(18, 1e18);
        ethPriceOracle = new MockV3Aggregator(18, 1300e18);
        (usdc, exchange, link, oracle, exchangeInfo) = deployContracts();
        helper = new Helper(
            address(exchange),
            address(nftOracle),
            address(ethPriceOracle),
            address(usdc)
        );

        exchange.initialVirtualPool(80e18);

        
        for(uint i=1; i <= 100; i++){
            address add = vm.addr(i);
            usdc.transfer(add, 1000e18);
            users.push(add);
        }

    }


    function updateFundingFraction() public {
        link.transfer(address(exchangeInfo), 1e18);

        uint marketPrice = exchange.marketPrice();
        uint oraclePrice = exchange.oraclePrice();

        int fundingFraction = (int(marketPrice)-int(oraclePrice))*10**18/int(oraclePrice);

        //updating fundingRate
        bytes32 requestId = exchangeInfo.requestFundingRate();
        uint[] memory price = new uint[](1);
        price[0] = (oraclePrice);
        int[] memory fundingRate = new int[](1);
        fundingRate[0] = fundingFraction;
        string[] memory emptyString = new string[](1);
        emptyString[0] = "M";
        address[] memory addresses = new address[](1);
        addresses[0] = address(exchange);
        oracle.fulfillOracleFundingRateRequest(requestId, price, fundingRate, emptyString, emptyString, addresses);
    }


    function testActions() public {
        bool shouldBeLong = true;
        bool shouldBeShort = false;
        uint startPrice = exchange.marketPrice();
        for(uint i; i < 100; i++) {
            vm.startPrank(users[i]);
            usdc.approve(address(exchange), 1000e18);
            exchange.depositCollateral(1000e18);
            assertEq(usdc.balanceOf(address(users[i])), 0);
            assertEq(exchange.collateral(address(usdc), address(users[i])), 1000e18);
            
            if(i<30){
                exchange.openShortPosition(1500e18, 0);
                if(startPrice > exchange.marketPrice() && (startPrice - exchange.marketPrice())*100/startPrice >= 50){
                    shouldBeLong = true;
                    shouldBeShort = false;
                    // startPrice = exchange.marketPrice();
                }
            }else{
                exchange.openLongPosition(1500e18, 0);
                if(startPrice < exchange.marketPrice() &&(exchange.marketPrice() - startPrice)*100/startPrice >= 50){
                    shouldBeLong = false;
                    shouldBeShort = true;
                    // startPrice = exchange.marketPrice();
                }
            }
            console.log("exchange market price", exchange.marketPrice()/1e18);
            vm.stopPrank();
            //update funding fee
            updateFundingFraction();
            //funding fee
            exchange.setFundingRate();
        }

        (int allLongAssetBalance, int256 allShortAssetBalance, int allLongUsdBalance, int allShortUsdBalance) = exchangeInfo.getTotalBalances(address(exchange));
        console.log("all Long asset balance");
        console.logInt(allLongAssetBalance);
        console.logInt(exchange.allLongvAssetBalances());
        console.log("all Short asset balance");
        console.logInt(allShortAssetBalance);
        console.logInt(exchange.allShortvAssetBalances());
        console.log("all Long usd balance");
        console.logInt(allLongUsdBalance);
        console.logInt(exchange.allLongvUsdBalances());
        console.log("all Short usd balance");
        console.logInt(allShortUsdBalance);
        console.logInt(exchange.allShortvUsdBalances());

        
        for(uint i; i < 100; i++) {
            console.log("***");
            console.log("index", i);
            console.log("user margin", exchange.positive(exchange.userMargin(users[i])));
            console.log("Asset balance", exchange.positive(exchange.uservAssetBalance(users[i]))/1e16);
            console.log("usd balance", exchange.positive(exchange.uservUsdBalance(users[i]))/1e16);
            // console.log("usd poolsize", (exchange.vUsdPoolSize())/1e16);
            console.log("***");
            vm.startPrank(users[i]);
            exchange.closePositionComplete(0);
            vm.stopPrank();
        }

        
        
        
    }

    
    
}