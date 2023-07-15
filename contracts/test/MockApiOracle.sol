// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;
import "./libs/LinkTokenReceiver.sol";
import "@chainlink/contracts/src/v0.8/interfaces/ChainlinkRequestInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "./libs/SafeMathChainlink.sol";

/**
 * @title The Chainlink Mock Oracle contract
 * @notice Chainlink smart contract developers can use this to test their contracts
 */
contract MockApiOracle is ChainlinkRequestInterface, LinkTokenReceiver {
  using SafeMathChainlink for uint256;

  uint256 public constant EXPIRY_TIME = 5 minutes;
  uint256 private constant MINIMUM_CONSUMER_GAS_LIMIT = 400000;

  struct Request {
    address callbackAddr;
    bytes4 callbackFunctionId;
  }

  LinkTokenInterface internal LinkToken;
  mapping(bytes32 => Request) private commitments;

  event OracleRequest(
    bytes32 indexed specId,
    address requester,
    bytes32 requestId,
    uint256 payment,
    address callbackAddr,
    bytes4 callbackFunctionId,
    uint256 cancelExpiration,
    uint256 dataVersion,
    bytes data
  );

  event CancelOracleRequest(bytes32 indexed requestId);

  /**
   * @notice Deploy with the address of the LINK token
   * @dev Sets the LinkToken address for the imported LinkTokenInterface
   * @param _link The address of the LINK token
   */
  constructor(address _link) public {
    LinkToken = LinkTokenInterface(_link); // external but already deployed and unalterable
  }

  

  /**
   * @notice Creates the Chainlink request
   * @dev Stores the hash of the params as the on-chain commitment for the request.
   * Emits OracleRequest event for the Chainlink node to detect.
   * @param _sender The sender of the request
   * @param _payment The amount of payment given (specified in wei)
   * @param _specId The Job Specification ID
   * @param _callbackAddress The callback address for the response
   * @param _callbackFunctionId The callback function ID for the response
   * @param _nonce The nonce sent by the requester
   * @param _dataVersion The specified data version
   * @param _data The CBOR payload of the request
   */
  function oracleRequest(
    address _sender,
    uint256 _payment,
    bytes32 _specId,
    address _callbackAddress,
    bytes4 _callbackFunctionId,
    uint256 _nonce,
    uint256 _dataVersion,
    bytes calldata _data
  ) external override onlyLINK checkCallbackAddress(_callbackAddress) {
    bytes32 requestId = keccak256(abi.encodePacked(_sender, _nonce));
    require(commitments[requestId].callbackAddr == address(0), "Must use a unique ID");
    // solhint-disable-next-line not-rely-on-time
    uint256 expiration = block.timestamp.add(EXPIRY_TIME);

    commitments[requestId] = Request(_callbackAddress, _callbackFunctionId);

    emit OracleRequest(
      _specId,
      _sender,
      requestId,
      _payment,
      _callbackAddress,
      _callbackFunctionId,
      expiration,
      _dataVersion,
      _data
    );
  }

  
  function fulfillOracleFundingRateRequest(bytes32 _requestId, uint256[] memory _prices, int256[] memory _fundingfractionaverages, string[] memory _names, string[] memory _contracts, address[] memory _addresses)
    external
    isValidRequest(_requestId)
    returns (bool)
  {
    Request memory req = commitments[_requestId];
    delete commitments[_requestId];
    require(gasleft() >= MINIMUM_CONSUMER_GAS_LIMIT, "Must provide consumer enough gas");
    // All updates to the oracle's fulfillment should come before calling the
    // callback(addr+functionId) as it is untrusted.
    // See: https://solidity.readthedocs.io/en/develop/security-considerations.html#use-the-checks-effects-interactions-pattern
    uint[] memory price = new uint[](1);
    price[0] = (1000e18);
    int[] memory fundingRate = new int[](1);
    fundingRate[0] = (2000e18);
    string[] memory strings = new string[](1);
    strings[0] = "Morteza";
    (bool success, ) = req.callbackAddr.call(
      // abi.encodeWithSelector(req.callbackFunctionId, _requestId, _data1, _data2, _data3, _data4, _data5)
      // abi.encodeWithSelector(req.callbackFunctionId, _requestId, convertUintToBytes32(price), convertIntToBytes32Array(fundingRate), convertStringToBytes32Array(strings))
      abi.encodeWithSelector(req.callbackFunctionId, _requestId, _prices, _fundingfractionaverages, _names, _contracts, _addresses)
    ); // solhint-disable-line avoid-low-level-calls
    return success;
  }

  function uintToBytes32(uint myUint) public pure returns (bytes32 myBytes32) {
        myBytes32 = bytes32(myUint);
    }
  function convertToBytes(uint256 value) public pure returns (bytes memory) {
        bytes memory byteArray = abi.encodePacked(value);
        
        return byteArray;
    }
    function convertUintToBytes32(uint[] memory uintArray) public pure returns (bytes32[] memory) {
        uint length = uintArray.length;
        require(length > 0, "Array is empty");

        uint numChunks = (length + 31) / 32;
        bytes32[] memory result = new bytes32[](numChunks);

        for (uint i = 0; i < numChunks; i++) {
            uint startIndex = i * 32;
            uint endIndex = startIndex + 32;
            if (endIndex > length) {
                endIndex = length;
            }
            uint[] memory chunk = new uint[](endIndex - startIndex);
            for (uint j = startIndex; j < endIndex; j++) {
                chunk[j - startIndex] = uintArray[j];
            }
            bytes32 chunkBytes = bytes32ArrayFromUintArray(chunk);
            result[i] = chunkBytes;
        }

        return result;
    }

    function bytes32ArrayFromUintArray(uint[] memory uintArray) private pure returns (bytes32) {
        bytes memory byteArray = new bytes(uintArray.length * 32);
        for (uint i = 0; i < uintArray.length; i++) {
            assembly {
                mstore(add(byteArray, add(32, mul(i, 32))), mload(add(uintArray, add(32, mul(i, 32)))))
            }
        }
        bytes32 result;
        assembly {
            result := mload(add(byteArray, 32))
        }
        return result;
    }
    function convertIntToBytes32Array(int256[] memory intArray) public pure returns (bytes32[] memory) {
        bytes memory byteArray = abi.encodePacked(intArray);
        uint256 length = intArray.length;
        require(length > 0, "Array is empty");

        require(byteArray.length % 32 == 0, "Invalid array length");

        bytes32[] memory bytes32Array = new bytes32[](length);
        for (uint256 i = 0; i < length; i++) {
            bytes32Array[i] = bytes32FromIntAtIndex(byteArray, i);
        }

        return bytes32Array;
    }

    function bytes32FromIntAtIndex(bytes memory byteArray, uint256 index) private pure returns (bytes32) {
        bytes32 result;
        assembly {
            result := mload(add(byteArray, add(32, mul(index, 32))))
        }
        return result;
    }

    function convertStringToBytes32Array(string[] memory stringArray) public pure returns (bytes32[] memory) {
        uint256 length = stringArray.length;
        require(length > 0, "Array is empty");

        bytes32[] memory bytes32Array = new bytes32[](length);
        for (uint256 i = 0; i < length; i++) {
            bytes32Array[i] = stringToBytes32(stringArray[i]);
        }

        return bytes32Array;
    }

    function stringToBytes32(string memory str) private pure returns (bytes32) {
        bytes32 result;
        assembly {
            result := mload(add(str, 32))
        }
        return result;
    }

  /**
   * @notice Called by the Chainlink node to fulfill requests
   * @dev Given params must hash back to the commitment stored from `oracleRequest`.
   * Will call the callback address' callback function without bubbling up error
   * checking in a `require` so that the node can get paid.
   * @param _requestId The fulfillment request ID that must match the requester's
   * @param _data The data to return to the consuming contract
   */
  function fulfillOracleOjectRequest(bytes32 _requestId, bytes32 _data)
    external
    isValidRequest(_requestId)
    returns (bool)
  {
    Request memory req = commitments[_requestId];
    delete commitments[_requestId];
    require(gasleft() >= MINIMUM_CONSUMER_GAS_LIMIT, "Must provide consumer enough gas");
    // All updates to the oracle's fulfillment should come before calling the
    // callback(addr+functionId) as it is untrusted.
    // See: https://solidity.readthedocs.io/en/develop/security-considerations.html#use-the-checks-effects-interactions-pattern
    (bool success, ) = req.callbackAddr.call(
      abi.encodeWithSelector(req.callbackFunctionId, _requestId, _data)
    ); // solhint-disable-line avoid-low-level-calls
    return success;
  }


  /**
   * @notice Called by the Chainlink node to fulfill requests
   * @dev Given params must hash back to the commitment stored from `oracleRequest`.
   * Will call the callback address' callback function without bubbling up error
   * checking in a `require` so that the node can get paid.
   * @param _requestId The fulfillment request ID that must match the requester's
   * @param _data The data to return to the consuming contract
   * @return Status if the external call was successful
   */
  function fulfillOracleStatusRequest(bytes32 _requestId, string calldata _data)
    external
    isValidRequest(_requestId)
    returns (bool)
  {
    Request memory req = commitments[_requestId];
    delete commitments[_requestId];
    require(gasleft() >= MINIMUM_CONSUMER_GAS_LIMIT, "Must provide consumer enough gas");
    // All updates to the oracle's fulfillment should come before calling the
    // callback(addr+functionId) as it is untrusted.
    // See: https://solidity.readthedocs.io/en/develop/security-considerations.html#use-the-checks-effects-interactions-pattern
    (bool success, ) = req.callbackAddr.call(
      abi.encodeWithSelector(req.callbackFunctionId, _requestId, _data)
    ); // solhint-disable-line avoid-low-level-calls
    return success;
  }

  /**
   * @notice Allows requesters to cancel requests sent to this oracle contract. Will transfer the LINK
   * sent for the request back to the requester's address.
   * @dev Given params must hash to a commitment stored on the contract in order for the request to be valid
   * Emits CancelOracleRequest event.
   * @param _requestId The request ID
   * @param _payment The amount of payment given (specified in wei)
   * @param _expiration The time of the expiration for the request
   */
  function cancelOracleRequest(
    bytes32 _requestId,
    uint256 _payment,
    bytes4,
    uint256 _expiration
  ) external override {
    require(commitments[_requestId].callbackAddr != address(0), "Must use a unique ID");
    // solhint-disable-next-line not-rely-on-time
    require(_expiration <= block.timestamp, "Request is not expired");

    delete commitments[_requestId];
    emit CancelOracleRequest(_requestId);

    assert(LinkToken.transfer(msg.sender, _payment));
  }

  /**
   * @notice Returns the address of the LINK token
   * @dev This is the public implementation for chainlinkTokenAddress, which is
   * an internal method of the ChainlinkClient contract
   */
  function getChainlinkToken() public view override returns (address) {
    return address(LinkToken);
  }

  // MODIFIERS

  /**
   * @dev Reverts if request ID does not exist
   * @param _requestId The given request ID to check in stored `commitments`
   */
  modifier isValidRequest(bytes32 _requestId) {
    require(commitments[_requestId].callbackAddr != address(0), "Must have a valid requestId");
    _;
  }

  /**
   * @dev Reverts if the callback address is the LINK token
   * @param _to The callback address
   */
  modifier checkCallbackAddress(address _to) {
    require(_to != address(LinkToken), "Cannot callback to LINK");
    _;
  }
}