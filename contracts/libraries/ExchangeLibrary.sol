// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma abicoder v2;


library ExchangeLibrary {
    
    //get output Asset by usd input amount if we want to buy(long)
  //how much Asset we will get by paying usd for long
  function getLongAssetAmountOut(uint256 _vUsdAmount, uint256 vAssetPoolSize, uint256 vUsdPoolSize) internal pure returns (uint256) {
    uint256 k = vAssetPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize + _vUsdAmount;
    uint256 newvAssetPoolSize = k / newvUsdPoolSize;
    uint256 userAsset = vAssetPoolSize - newvAssetPoolSize;
    return userAsset;
  }

  //get output usd amount by Asset input amount if we want to buy(long)
  function getLongVusdAmountOut(uint256 _vAssetAmount, uint256 vAssetPoolSize, uint256 vUsdPoolSize) internal pure returns (uint256) {
    uint256 k = vAssetPoolSize * vUsdPoolSize;
    uint256 newvAssetPoolSize = vAssetPoolSize - _vAssetAmount;
    uint256 newvUsdPoolSize = k / newvAssetPoolSize;
    uint256 uservUsd = newvUsdPoolSize - vUsdPoolSize;
    return uservUsd;
  }

  //get output Asset by usd input amount if we want to sell(short)
  function getShortAssetAmountOut(uint256 _vUsdAmount, uint256 vAssetPoolSize, uint256 vUsdPoolSize) external pure returns (uint256) {
    uint256 k = vAssetPoolSize * vUsdPoolSize;
    uint256 newvUsdPoolSize = vUsdPoolSize - _vUsdAmount;
    uint256 newvAssetPoolSize = k / newvUsdPoolSize;
    uint256 userAsset = newvAssetPoolSize - vAssetPoolSize;
    return userAsset;
  }

  //get output usd by Asset input amount if we want to sell(short)
  function getShortVusdAmountOut(uint256 _vAssetAmount, uint256 vAssetPoolSize, uint256 vUsdPoolSize) external pure returns (uint256) {
    uint256 k = vAssetPoolSize * vUsdPoolSize;
    uint256 newvAssetPoolSize = vAssetPoolSize + _vAssetAmount;
    uint256 newvUsdPoolSize = k / newvAssetPoolSize;
    uint256 uservUsd = vUsdPoolSize - newvUsdPoolSize;
    return uservUsd;
  }
  
}
