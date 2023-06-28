// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// AutomationCompatible.sol imports the functions from both ./AutomationBase.sol and
// ./interfaces/AutomationCompatibleInterface.sol
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";
import "../Exchange.sol";
/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */

contract ExchangePriceListener is AutomationCompatibleInterface {
    /**
     * Public counter variable
     */
    Exchange public exchange;
    uint public counter;

    /**
     * Use an interval in seconds and a timestamp to slow execution of Upkeep
     */
    uint public immutable interval;
    uint public lastTimeStamp;

    constructor(uint updateInterval) {
        interval = updateInterval;
        lastTimeStamp = block.timestamp;

        counter = 0;
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
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
        
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        
        if ((block.timestamp - lastTimeStamp) > interval) {
            lastTimeStamp = block.timestamp;
            counter = counter + 1;
        }
        
    }
}
