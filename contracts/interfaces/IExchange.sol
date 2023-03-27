// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
pragma abicoder v2;

interface IExchange {
  function AutoCloseMargin (  ) external view returns ( uint8 );
  function _calculatePartialLiquidateValue ( address _user, uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize ) external view returns ( uint256 );
  function _getNewAccountValue ( address _user, uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize ) external view returns ( int256 );
  function _getNewPNL ( address _user, uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize ) external view returns ( int256 );
  function _getNewPositionNotional ( address _user, uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize ) external view returns ( uint256 );
  function _isHardLiquidatable ( address _user, uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize ) external view returns ( bool );
  function _isNewMarginLiquidatable ( address _user, uint256 _usdAmount, uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize ) external view returns ( bool );
  function _isPartialLiquidatable ( address _user, uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize ) external view returns ( bool );
  function _userNewMargin ( address _user, uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize ) external view returns ( int256 );
  function absoluteInt ( int256 _value ) external pure returns ( int256 );
  function activeUsers ( uint256 ) external view returns ( address );
  function calculatePartialLiquidateValue ( address _user ) external view returns ( uint256 x );
  function changeNftOracleAddress ( address _newAddress ) external;
  function closePosition ( uint256 _assetSize, uint256 _minimumUsdOut ) external;
  function closePositionComplete ( uint256 _minimumUsdOut ) external;
  function collateral ( address, address ) external view returns ( uint256 );
  function depositCollateral ( uint256 _amount ) external;
  function discountRate (  ) external view returns ( uint8 );
  function doesUserExist ( address _user ) external view returns ( bool );
  function getAccountValue ( address _user ) external view returns ( int256 );
  function getAllActiveUsers (  ) external view returns ( address[] memory);
  function getAllLongvBaycBalance (  ) external view returns ( int256 );
  function getAllShortvBaycBalance (  ) external view returns ( int256 );
  function getCurrentExchangePrice (  ) external view returns ( uint256 );
  function getEthUsdPrice (  ) external view returns ( uint256 );
  function getLongBaycAmountOut ( uint256 _vUsdAmount ) external view returns ( uint256 );
  function getLongVusdAmountOut ( uint256 _vBaycAmount ) external view returns ( uint256 );
  function getMinimumLongBaycOut ( uint256 _usdAmount ) external view returns ( uint256 );
  function getMinimumLongUsdOut ( uint256 _BaycAmount ) external view returns ( uint256 );
  function getMinimumShortBaycOut ( uint256 _usdAmount ) external view returns ( uint256 );
  function getMinimumShortUsdOut ( uint256 _BaycAmount ) external view returns ( uint256 );
  function getPNL ( address _user ) external view returns ( int256 pnl );
  function getPositionNotional ( address _user ) external view returns ( uint256 );
  function getShortBaycAmountOut ( uint256 _vUsdAmount ) external view returns ( uint256 );
  function getShortVusdAmountOut ( uint256 _vBaycAmount ) external view returns ( uint256 );
  function initialVirtualPool ( uint256 _assetSize ) external;
  function insuranceFunds (  ) external view returns ( uint256 );
  function isHardLiquidatable ( address _user ) external view returns ( bool );
  function isLongInRightRange ( uint256 _usdAmount ) external view returns ( bool );
  function isPartialLiquidatable ( address _user ) external view returns ( bool );
  function isPriceIntheRightRange ( uint256 _vBaycNewPoolSize, uint256 _vUsdNewPoolSize ) external view returns ( bool );
  function isShortInRightRange ( uint256 _usdAmount ) external view returns ( bool );
  function latestFeeUpdate (  ) external view returns ( uint256 );
  function maintenanceMargin (  ) external view returns ( uint8 );
  function marketPrice (  ) external view returns ( uint256 );
  function openLongPosition ( uint256 _usdAmount, uint256 _minimumBaycAmountOut ) external;
  function openShortPosition ( uint256 _usdAmount, uint256 _minimumBaycAmountOut ) external;
  function oraclePrice (  ) external view returns ( uint256 );
  function owner (  ) external view returns ( address );
  function pool (  ) external view returns ( uint256 vBaycPoolSize, uint256 vUsdPoolSize );
  function poolInitialized (  ) external view returns ( bool );
  function positive ( int256 _amount ) external pure returns ( uint256 );
  function priceFeed (  ) external view returns ( address );
  function removeInsuranceFunds ( uint256 _amount ) external;
  function renounceOwnership (  ) external;
  function saveLevelMargin (  ) external view returns ( uint8 );
  function setFundingRate (  ) external;
  function setSwapFee ( uint8 _newFee ) external;
  function showPriceETH (  ) external view returns ( uint256 );
  function showPriceUSD (  ) external view returns ( uint256 );
  function swapFee (  ) external view returns ( uint8 );
  function transferOwnership ( address newOwner ) external;
  function usdc (  ) external view returns ( address );
  function userMargin ( address _user ) external view returns ( int256 );
  function uservBaycBalance ( address _user ) external view returns ( int256 );
  function uservUsdBalance ( address _user ) external view returns ( int256 );
  function vBaycPoolSize (  ) external view returns ( uint256 );
  function vUsdPoolSize (  ) external view returns ( uint256 );
  function virtualBalances ( address ) external view returns ( int256 virtualCollateral, int256 uservUsdBalance, int256 uservBaycBalance );
  function virtualCollateral ( address _user ) external view returns ( int256 );
  function withdrawCollateral ( uint256 _amount ) external;
}