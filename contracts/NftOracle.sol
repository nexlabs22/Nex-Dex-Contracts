// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

/**
 * @title A consumer contract template for the NFTBank adapter to get certain NFTs information.
 * @author LinkPool
 * @notice The accepted `pricingAsset` values are `ETH` and `USD`, but defaults to `ETH` if an invalid value is passed.
 * @dev Uses @chainlink/contracts 0.4.2.
 */
contract NftOracle is ChainlinkClient {
    using Chainlink for Chainlink.Request;

    struct TimestampAndFloorPrice {
        uint128 timestamp;
        uint128 floorPrice;
    }

    mapping(bytes32 => uint256) public requestIdPrice;
    mapping(bytes32 => bytes32) public requestIdTimestampAndFloorPrice;
    uint public price;
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
        price = _estimate;
        latestRequestId = _requestId;
    }

    /**
     * @param _requestId The request ID for fulfillment.
     * @param _result The submission timestamp and floor price of an NFT collection.
     */
    function fulfillTimesampAndFloorPrice(bytes32 _requestId, bytes32 _result)
        external
        recordChainlinkFulfillment(_requestId)
    {
        requestIdTimestampAndFloorPrice[_requestId] = _result;
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

        req.addBytes("assetAddress", abi.encode(_assetAddress));
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
    ) external {
        Chainlink.Request memory req = buildOperatorRequest(_specId, this.fulfillPrice.selector);

        req.addBytes("assetAddress", abi.encode(_assetAddress));
        req.add("pricingAsset", _pricingAsset);

         sendOperatorRequest(req, _payment);
    }

    /**
     * @notice Requests the floor price and the date at which the price was reported.
     * @param _specId the jobID.
     * @param _payment the LINK amount in Juels (i.e. 10^18 aka 1 LINK).
     * @param _assetAddress the NFT Collection address of which you want to find an estimate.
     * @param _pricingAsset the asset of the price. Defaults to 'ETH'.
     */
    function getTimestampAndFloorPrice(
        bytes32 _specId,
        uint256 _payment,
        address _assetAddress,
        string calldata _pricingAsset
    ) external {
        Chainlink.Request memory req = buildOperatorRequest(_specId, this.fulfillTimesampAndFloorPrice.selector);

        req.addBytes("assetAddress", abi.encode(_assetAddress));
        req.add("pricingAsset", _pricingAsset);

        sendOperatorRequest(req, _payment);
    }

    function setOracle(address _oracle) external {
        setChainlinkOracle(_oracle);
    }

    function withdrawLink(address payable _payee, uint256 _amount) external {
        LinkTokenInterface linkToken = LinkTokenInterface(chainlinkTokenAddress());
        if (!linkToken.transfer(_payee, _amount)) {
            revert FailedTransferLINK(_payee, _amount);
        }
    }

    /* ========== EXTERNAL VIEW FUNCTIONS ========== */

    function getTimestampAndFloorPrice(bytes32 _requestId) external view returns (TimestampAndFloorPrice memory) {
        TimestampAndFloorPrice memory timestampAndFloorPrice = TimestampAndFloorPrice(
            uint128(bytes16(requestIdTimestampAndFloorPrice[_requestId])),
            uint128(bytes16(requestIdTimestampAndFloorPrice[_requestId] << 128))
        );
        return timestampAndFloorPrice;
    }

    function getOracleAddress() external view returns (address) {
        return chainlinkOracleAddress();
    }
}