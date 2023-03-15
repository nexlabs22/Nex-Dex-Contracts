// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma abicoder v2;


library ExchangeLibrary {
    
    //get output Bayc by usd input amount if we want to buy(long)
  //how much Bayc we will get by paying usd for long
  function getLongBaycAmountOut(uint256 _vUsdAmount, uint256 vBaycPoolSize, uint256 vUsdPoolSize) internal pure returns (uint256) {
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize + _vUsdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = vBaycPoolSize - newvBaycPoolSize;
    return userBayc;
  }

  //get output usd amount by Bayc input amount if we want to buy(long)
  function getLongVusdAmountOut(uint256 _vBaycAmount, uint256 vBaycPoolSize, uint256 vUsdPoolSize) internal pure returns (uint256) {
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvBaycPoolSize = vBaycPoolSize - _vBaycAmount;
    uint256 newvUsdPoolSize = k / newvBaycPoolSize;
    uint256 uservUsd = newvUsdPoolSize - vUsdPoolSize;
    return uservUsd;
  }

  //get output Bayc by usd input amount if we want to sell(short)
  function getShortBaycAmountOut(uint256 _vUsdAmount, uint256 vBaycPoolSize, uint256 vUsdPoolSize) external pure returns (uint256) {
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize - _vUsdAmount;
    uint256 newvBaycPoolSize = k / newvUsdPoolSize;
    uint256 userBayc = newvBaycPoolSize - vBaycPoolSize;
    return userBayc;
  }

  //get output usd by Bayc input amount if we want to sell(short)
  function getShortVusdAmountOut(uint256 _vBaycAmount, uint256 vBaycPoolSize, uint256 vUsdPoolSize) external pure returns (uint256) {
    uint256 k = vBaycPoolSize * vUsdPoolSize;
    uint256 newvBaycPoolSize = vBaycPoolSize + _vBaycAmount;
    uint256 newvUsdPoolSize = k / newvBaycPoolSize;
    uint256 uservUsd = vUsdPoolSize - newvUsdPoolSize;
    return uservUsd;
  }
  
}
