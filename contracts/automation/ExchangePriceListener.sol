// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// ./interfaces/AutomationCompatibleInterface.sol
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../Exchange.sol";
import "../ExchangeInfo.sol";


contract ExchangePriceListener is AutomationCompatibleInterface, Ownable {
    
    Exchange public exchange;
    ExchangeInfo public exchangeInfo;
    uint public lastUpdateTime;

    

    constructor(address _exchange, address _exchangeInfo) {
        exchange = Exchange(_exchange);
        exchangeInfo = ExchangeInfo(_exchangeInfo);
    }

    function setExchange(address _exchange) public onlyOwner {
        exchange = Exchange(_exchange);
    }

    function setExchangeInfo(address _exchangeInfo) public onlyOwner {
        exchangeInfo = ExchangeInfo(_exchangeInfo);
    }

    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        uint marketPrice = exchange.marketPrice();
        uint lastMarketPrice = exchangeInfo.lastMarketPrice();

        if(marketPrice*100/lastMarketPrice < 90 || marketPrice*100/lastMarketPrice > 110){
            upkeepNeeded = true;
        }
    
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        uint marketPrice = exchange.marketPrice();
        uint lastMarketPrice = exchangeInfo.lastMarketPrice();

        if(marketPrice*100/lastMarketPrice < 90 || marketPrice*100/lastMarketPrice > 110){
           exchangeInfo.requestFundingRate();
        }
        lastUpdateTime = block.timestamp;
        
    }
}
