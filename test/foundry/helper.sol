// SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.13;
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../../contracts/Exchange.sol";
import "../../contracts/Token.sol";
import "../../contracts/test/MockV3AggregatorV8.sol";

contract Helper {
    Exchange public exchange;
    
    Token public usdc;
    MockV3Aggregator public nftOracle;
    MockV3Aggregator public ethPriceOracle;

    constructor(
        address _exchange,
        address _nftOracle,
        address _ethPriceOracle,
        address _usdc
    ) {
        exchange = Exchange(_exchange);
        nftOracle = MockV3Aggregator(_nftOracle);
        ethPriceOracle = MockV3Aggregator(_ethPriceOracle);
        usdc = Token(_usdc);
    }


    function absoluteInt(int256 _value) public view returns (int256) {
        if (_value < 0) {
        return -(_value);
        } else {
        return _value;
        }
    }

    

    function getShortVusdAmountOut(uint _vBaycAmount) public view returns(uint) {
        uint256 k = exchange.vBaycPoolSize() * exchange.vUsdPoolSize();
        uint256 newvBaycPoolSize = exchange.vBaycPoolSize() + _vBaycAmount;
        uint256 newvUsdPoolSize = k / newvBaycPoolSize;
        uint256 uservUsd = exchange.vUsdPoolSize() - newvUsdPoolSize;
    return uservUsd;
    }


    function getLongVusdAmountOut(uint _vBaycAmount) public view returns(uint) {
        uint256 k = exchange.vBaycPoolSize() * exchange.vUsdPoolSize();
        uint256 newvBaycPoolSize = exchange.vBaycPoolSize() - _vBaycAmount;
        uint256 newvUsdPoolSize = k / newvBaycPoolSize;
        uint256 uservUsd = newvUsdPoolSize - exchange.vUsdPoolSize();
        return uservUsd;
    }

    function positive(int256 _amount) public view returns (uint256) {
    if (_amount < 0) {
      int256 posAmount = -(_amount);
      return uint256(posAmount);
    } else {
      return uint256(_amount);
    }
  }

    function getPNL(address _user) public view returns (int256 pnl) {
    if (exchange.uservBaycBalance(_user) > 0) {
      uint256 currentBaycValue = getShortVusdAmountOut(
        uint256(exchange.uservBaycBalance(_user))
      );
      pnl = int256(currentBaycValue) + (exchange.uservUsdBalance(_user));
    } else if (exchange.uservBaycBalance(_user) < 0) {
      uint256 currentBaycValue = getLongVusdAmountOut(
        positive(exchange.uservBaycBalance(_user))
      );
      pnl = exchange.uservUsdBalance(_user) - int256(currentBaycValue);
    } else {
      pnl = 0;
    }
  }

    function getAccountValue(address _user) public view returns (int256) {
        uint256 collateralValue = exchange.collateral(address(usdc), _user);
        int256 pnl = getPNL(_user);
        int256 fundingReward = exchange.virtualCollateral(_user);
        int256 accountValue = int256(collateralValue) + pnl + fundingReward;
        return accountValue;
    }



    function getPositionNotional(address _user) public view returns (uint256) {
        if (exchange.uservBaycBalance(_user) > 0) {
        uint256 positionNotionalValue = getShortVusdAmountOut(
            uint256(exchange.uservBaycBalance(_user))
        );
        return positionNotionalValue;
        } else if (exchange.uservBaycBalance(_user) < 0) {
        uint256 positionNotionalValue = getLongVusdAmountOut(
            uint256(absoluteInt((exchange.uservBaycBalance(_user))))
        );
        return positionNotionalValue;
        } else {
        return 0;
        }
    }

    
    function userMargin(address _user) public view returns (int256) {
    int256 accountValue = getAccountValue(_user);
    uint256 positionNotional = getPositionNotional(_user);
    if (accountValue != 0 && positionNotional > 0) {
      int256 margin = (100 * accountValue) / int256(positionNotional);
      return margin;
    } else {
      return 0;
    }
  }
    
}
