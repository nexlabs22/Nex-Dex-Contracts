// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

/**
 * @title A consumer contract template for the NFTBank adapter to get certain NFTs information.
 * @author LinkPool
 * @notice The accepted `pricingAsset` values are `ETH` and `USD`, but defaults to `ETH` if an invalid value is passed.
 * @dev Uses @chainlink/contracts 0.4.0.
 */
contract NftOracle is ChainlinkClient {
    using Chainlink for Chainlink.Request;

    mapping(bytes32 => uint256) public requestIdPrice;
    mapping(bytes32 => DateAndPrice) public requestIdDateAndPrice;

    struct DateAndPrice {
        uint128 date;
        uint128 price;
    }

    uint256 public latestPrice;
    bytes32 public latestRequestId;

    error FailedTransferLINK(address to, uint256 amount);

    /* ========== CONSTRUCTOR ========== */

    /**
     * @param _link the LINK token address.
     * @param _oracle the Operator.sol contract address.
     */
    constructor(address _link, address _oracle) {
        setChainlinkToken(_link);
        setChainlinkOracle(_oracle);
    }

    /* ========== EXTERNAL FUNCTIONS ========== */

    function cancelRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunctionId,
        uint256 _expiration
    ) external {
        cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
    }

    /**
     * @param _requestId The request ID for fulfillment.
     * @param _estimate The estimate for the given NFT ID in the provided pricing asset.
     */
    function fulfillPrice(bytes32 _requestId, uint256 _estimate) external recordChainlinkFulfillment(_requestId) {
        requestIdPrice[_requestId] = _estimate;
    }

    function fulfillDateAndPrice(bytes32 _requestId, bytes32 _result) external recordChainlinkFulfillment(_requestId) {
        requestIdDateAndPrice[_requestId] = getDateAndPrice(_result);
    }

    /**
     * @notice Requests the estimate price.
     * @param _specId the jobID.
     * @param _payment the LINK amount in Juels (i.e. 10^18 aka 1 LINK).
     * @param _assetAddress the NFT Collection address of which you want to find an estimate.
     * @param _tokenId The NFT ID for the item you want to find an estimate for.
     * @param _pricingAsset the asset of the price. Defaults to 'ETH'.
     */
    function getEstimate(
        bytes32 _specId,
        uint256 _payment,
        address _assetAddress,
        uint256 _tokenId,
        string calldata _pricingAsset
    ) external {
        Chainlink.Request memory req = buildOperatorRequest(_specId, this.fulfillPrice.selector);

        req.addBytes("assetAddress", abi.encodePacked(_assetAddress));
        req.addUint("tokenId", _tokenId);
        req.add("pricingAsset", _pricingAsset);

        sendOperatorRequest(req, _payment);
        
    }

    /**
     * @notice Requests the floor price.
     * @param _specId the jobID.
     * @param _payment the LINK amount in Juels (i.e. 10^18 aka 1 LINK).
     * @param _assetAddress the NFT Collection address of which you want to find an estimate.
     * @param _pricingAsset the asset of the price. Defaults to 'ETH'.
     */
    function getFloorPrice(
        bytes32 _specId,
        uint256 _payment,
        address _assetAddress,
        string calldata _pricingAsset
    ) public returns(bytes32) {
        Chainlink.Request memory req = buildChainlinkRequest(_specId, address(this), this.fulfillPrice.selector);

        req.addBytes("assetAddress", abi.encodePacked(_assetAddress));
        req.add("pricingAsset", _pricingAsset);

         return sendChainlinkRequest(req, _payment);
    }

    /**
     * @notice Requests the floor price and the date at which the price was reported.
     * @param _specId the jobID.
     * @param _payment the LINK amount in Juels (i.e. 10^18 aka 1 LINK).
     * @param _assetAddress the NFT Collection address of which you want to find an estimate.
     * @param _pricingAsset the asset of the price. Defaults to 'ETH'.
     */
    function getDateAndFloorPrice(
        bytes32 _specId,
        uint256 _payment,
        address _assetAddress,
        string calldata _pricingAsset
    ) public returns (bytes32 requestId){
        Chainlink.Request memory req = buildChainlinkRequest(_specId, address(this), this.fulfillDateAndPrice.selector);

        req.addBytes("assetAddress", abi.encodePacked(_assetAddress));
        req.add("pricingAsset", _pricingAsset);

        return sendChainlinkRequest(req, _payment);
    }

    function setOracle(address _oracle) external {
        setChainlinkOracle(_oracle);
    }

    function withdrawLink(uint256 _amount, address payable _payee) external {
        LinkTokenInterface linkToken = LinkTokenInterface(chainlinkTokenAddress());
        _requireTransferLINK(linkToken.transfer(_payee, _amount), _payee, _amount);
    }

    /* ========== EXTERNAL VIEW FUNCTIONS ========== */

    function getOracleAddress() external view returns (address) {
        return chainlinkOracleAddress();
    }

    /* ========== PRIVATE PURE FUNCTIONS ========== */

    function getDateAndPrice(bytes32 _data) private pure returns (DateAndPrice memory) {
        DateAndPrice memory dateAndPrice = DateAndPrice(uint128(bytes16(_data)), uint128(bytes16(_data << 128)));
        return dateAndPrice;
    }

    function _requireTransferLINK(
        bool _success,
        address _to,
        uint256 _amount
    ) private pure {
        if (!_success) {
            revert FailedTransferLINK(_to, _amount);
        }
    }

  function showPrice(bytes32 _id) public view returns(uint256){
      uint256 price = requestIdPrice[_id];
      return price;
  }
}