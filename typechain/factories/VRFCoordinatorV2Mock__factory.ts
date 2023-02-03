/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Signer,
  utils,
  Contract,
  ContractFactory,
  Overrides,
  BigNumberish,
} from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  VRFCoordinatorV2Mock,
  VRFCoordinatorV2MockInterface,
} from "../VRFCoordinatorV2Mock";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint96",
        name: "_baseFee",
        type: "uint96",
      },
      {
        internalType: "uint96",
        name: "_gasPriceLink",
        type: "uint96",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "InsufficientBalance",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidConsumer",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidRandomWords",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidSubscription",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "MustBeSubOwner",
    type: "error",
  },
  {
    inputs: [],
    name: "TooManyConsumers",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint64",
        name: "subId",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "address",
        name: "consumer",
        type: "address",
      },
    ],
    name: "ConsumerAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint64",
        name: "subId",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "address",
        name: "consumer",
        type: "address",
      },
    ],
    name: "ConsumerRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "requestId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "outputSeed",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint96",
        name: "payment",
        type: "uint96",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    name: "RandomWordsFulfilled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "keyHash",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "requestId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "preSeed",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint64",
        name: "subId",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "uint16",
        name: "minimumRequestConfirmations",
        type: "uint16",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "callbackGasLimit",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "numWords",
        type: "uint32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RandomWordsRequested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint64",
        name: "subId",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "SubscriptionCanceled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint64",
        name: "subId",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "SubscriptionCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint64",
        name: "subId",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "oldBalance",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newBalance",
        type: "uint256",
      },
    ],
    name: "SubscriptionFunded",
    type: "event",
  },
  {
    inputs: [],
    name: "BASE_FEE",
    outputs: [
      {
        internalType: "uint96",
        name: "",
        type: "uint96",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "GAS_PRICE_LINK",
    outputs: [
      {
        internalType: "uint96",
        name: "",
        type: "uint96",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_CONSUMERS",
    outputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "_subId",
        type: "uint64",
      },
    ],
    name: "acceptSubscriptionOwnerTransfer",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "_subId",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "_consumer",
        type: "address",
      },
    ],
    name: "addConsumer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "_subId",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
    ],
    name: "cancelSubscription",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "_subId",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "_consumer",
        type: "address",
      },
    ],
    name: "consumerIsAdded",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "createSubscription",
    outputs: [
      {
        internalType: "uint64",
        name: "_subId",
        type: "uint64",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_requestId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_consumer",
        type: "address",
      },
    ],
    name: "fulfillRandomWords",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_requestId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_consumer",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "_words",
        type: "uint256[]",
      },
    ],
    name: "fulfillRandomWordsWithOverride",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "_subId",
        type: "uint64",
      },
      {
        internalType: "uint96",
        name: "_amount",
        type: "uint96",
      },
    ],
    name: "fundSubscription",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getConfig",
    outputs: [
      {
        internalType: "uint16",
        name: "minimumRequestConfirmations",
        type: "uint16",
      },
      {
        internalType: "uint32",
        name: "maxGasLimit",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "stalenessSeconds",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "gasAfterPaymentCalculation",
        type: "uint32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getFallbackWeiPerUnitLink",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getFeeConfig",
    outputs: [
      {
        internalType: "uint32",
        name: "fulfillmentFlatFeeLinkPPMTier1",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "fulfillmentFlatFeeLinkPPMTier2",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "fulfillmentFlatFeeLinkPPMTier3",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "fulfillmentFlatFeeLinkPPMTier4",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "fulfillmentFlatFeeLinkPPMTier5",
        type: "uint32",
      },
      {
        internalType: "uint24",
        name: "reqsForTier2",
        type: "uint24",
      },
      {
        internalType: "uint24",
        name: "reqsForTier3",
        type: "uint24",
      },
      {
        internalType: "uint24",
        name: "reqsForTier4",
        type: "uint24",
      },
      {
        internalType: "uint24",
        name: "reqsForTier5",
        type: "uint24",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRequestConfig",
    outputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
      {
        internalType: "bytes32[]",
        name: "",
        type: "bytes32[]",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "_subId",
        type: "uint64",
      },
    ],
    name: "getSubscription",
    outputs: [
      {
        internalType: "uint96",
        name: "balance",
        type: "uint96",
      },
      {
        internalType: "uint64",
        name: "reqCount",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address[]",
        name: "consumers",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "subId",
        type: "uint64",
      },
    ],
    name: "pendingRequestExists",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "_subId",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "_consumer",
        type: "address",
      },
    ],
    name: "removeConsumer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_keyHash",
        type: "bytes32",
      },
      {
        internalType: "uint64",
        name: "_subId",
        type: "uint64",
      },
      {
        internalType: "uint16",
        name: "_minimumRequestConfirmations",
        type: "uint16",
      },
      {
        internalType: "uint32",
        name: "_callbackGasLimit",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "_numWords",
        type: "uint32",
      },
    ],
    name: "requestRandomWords",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "_subId",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "_newOwner",
        type: "address",
      },
    ],
    name: "requestSubscriptionOwnerTransfer",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
];

const _bytecode =
  "0x60e0604052606460c08190526001805560025534801561001e57600080fd5b50604051620017973803806200179783398101604081905261003f91610072565b6001600160601b039182166080521660a0526100a5565b80516001600160601b038116811461006d57600080fd5b919050565b6000806040838503121561008557600080fd5b61008e83610056565b915061009c60208401610056565b90509250929050565b60805160a05160c0516116ad620000ea6000396000818161023d01526109fc0152600081816102de015261065301526000818161019e015261069e01526116ad6000f3fe608060405234801561001057600080fd5b506004361061012b5760003560e01c806382359740116100ad578063afc69b5311610071578063afc69b5314610323578063c3f909d414610336578063d7ae1d3014610361578063e82ad7d414610374578063ed5eb06d1461039757600080fd5b806382359740146102985780639f87fad7146102a6578063a21a23e4146102b9578063a410347f146102d9578063a47c76961461030057600080fd5b80635d3b1d30116100f45780635d3b1d30146101d85780635fbbc0d2146101eb57806364d51a2a146102385780637341c10c14610272578063808974ff1461028557600080fd5b80620122911461013057806304c357cb1461015a57806308e3898e1461016f578063356dac71146101825780633d18651e14610199575b600080fd5b6040805160008152602081019182905261015191600391621e8480916111c4565b60405180910390f35b61016d610168366004611256565b6103aa565b005b61016d61017d36600461129f565b6103e9565b660e35fa931a00005b604051908152602001610151565b6101c07f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160601b039091168152602001610151565b61018b6101e636600461138c565b6107e6565b60408051620186a080825260208201819052918101829052606081018290526080810191909152600060a0820181905260c0820181905260e0820181905261010082015261012001610151565b61025f7f000000000000000000000000000000000000000000000000000000000000000081565b60405161ffff9091168152602001610151565b61016d610280366004611256565b610968565b61016d6102933660046113f3565b610ac9565b61016d610168366004611416565b61016d6102b4366004611256565b610ae9565b6102c1610d00565b6040516001600160401b039091168152602001610151565b6101c07f000000000000000000000000000000000000000000000000000000000000000081565b61031361030e366004611416565b610dc8565b6040516101519493929190611438565b61016d6103313660046114b2565b610eb4565b6040805160048152622625a06020820152610a8c918101919091526182056060820152608001610151565b61016d61036f366004611256565b610fb0565b610387610382366004611416565b6110b1565b6040519015158152602001610151565b6103876103a5366004611256565b6110ee565b60405162461bcd60e51b815260206004820152600f60248201526e1b9bdd081a5b5c1b195b595b9d1959608a1b60448201526064015b60405180910390fd5b60005a6000858152600560205260408120549192506001600160401b03909116900361044d5760405162461bcd60e51b81526020600482015260136024820152721b9bdb995e1a5cdd195b9d081c995c5d595cdd606a1b60448201526064016103e0565b6000848152600560209081526040808320815160608101835290546001600160401b038116825263ffffffff600160401b8204811694830194909452600160601b900490921690820152835190910361056557806040015163ffffffff166001600160401b038111156104c2576104c2611289565b6040519080825280602002602001820160405280156104eb578160200160208202803683370190505b50925060005b816040015163ffffffff1681101561055f5760408051602081018890529081018290526060016040516020818303038152906040528051906020012060001c848281518110610542576105426114f5565b60209081029190910101528061055781611521565b9150506104f1565b50610590565b806040015163ffffffff1683511461059057604051631f9efadb60e11b815260040160405180910390fd5b600080631fe543e360e01b87866040516024016105ae92919061153a565b604051602081830303815290604052906001600160e01b0319166020820180516001600160e01b03838183161783525050505090506000866001600160a01b0316846020015163ffffffff16836040516106089190611588565b60006040518083038160008787f1925050503d8060008114610646576040519150601f19603f3d011682016040523d82523d6000602084013e61064b565b606091505b5050905060007f00000000000000000000000000000000000000000000000000000000000000006001600160601b03165a61068690886115b7565b61069091906115ca565b6106c3906001600160601b037f0000000000000000000000000000000000000000000000000000000000000000166115e1565b85516001600160401b03166000908152600360205260409020549091506001600160601b03808316600160a01b90920416101561071357604051631e9acf1760e31b815260040160405180910390fd5b84516001600160401b03166000908152600360205260409020805482919060149061074f908490600160a01b90046001600160601b03166115f4565b82546101009290920a6001600160601b0381810219909316918316021790915560008b81526005602090815260409182902080546fffffffffffffffffffffffffffffffff1916905581518d815292851690830152841515908201528a91507f7dffc5ae5ee4e2e4df1651cf6ad329a73cebdb728f37ea0187b9b17e036756e49060600160405180910390a2505050505050505050565b600084336107f482826110ee565b610811576040516371e8313760e01b815260040160405180910390fd5b6001600160401b0387166000908152600360205260409020546001600160a01b031661085057604051630fb532db60e11b815260040160405180910390fd5b600180546000918261086183611521565b9091555060028054919250600091908261087a83611521565b9091555060408051606080820183526001600160401b038d811680845263ffffffff8d811660208087018281528f8416888a0181815260008e8152600585528b902099518a54935191518716600160601b0263ffffffff60601b1992909716600160401b026bffffffffffffffffffffffff19909416981697909717919091179590951692909217909555855189815290810187905261ffff8f16818701529283019390935260808201529151929350339290918d917f63373d1c4696214b898952999c9aaec57dac1ee2723cec59bea6888f489a97729160a0908290030190a45098975050505050505050565b6001600160401b03821660009081526003602052604090205482906001600160a01b0316806109aa57604051630fb532db60e11b815260040160405180910390fd5b336001600160a01b038216146109de57604051636c51fda960e11b81526001600160a01b03821660048201526024016103e0565b6001600160401b03841660009081526004602052604090205461ffff7f0000000000000000000000000000000000000000000000000000000000000000169003610a3b576040516305a48e0f60e01b815260040160405180910390fd5b610a4584846110ee565b610ac3576001600160401b038416600081815260046020908152604080832080546001810182559084529282902090920180546001600160a01b0319166001600160a01b03881690811790915591519182527f752ead9f4536ec1319ee3a5a604e1d65eded22e0924251552ba14ae4faa1bbc3910160405180910390a25b50505050565b604080516000815260208101909152610ae590839083906103e9565b5050565b6001600160401b03821660009081526003602052604090205482906001600160a01b031680610b2b57604051630fb532db60e11b815260040160405180910390fd5b336001600160a01b03821614610b5f57604051636c51fda960e11b81526001600160a01b03821660048201526024016103e0565b8383610b6b82826110ee565b610b88576040516371e8313760e01b815260040160405180910390fd5b6001600160401b0386166000908152600460205260408120905b8154811015610caf57866001600160a01b0316828281548110610bc757610bc76114f5565b6000918252602090912001546001600160a01b031603610c9d5781546000908390610bf4906001906115b7565b81548110610c0457610c046114f5565b9060005260206000200160009054906101000a90046001600160a01b0316905080838381548110610c3757610c376114f5565b9060005260206000200160006101000a8154816001600160a01b0302191690836001600160a01b0316021790555082805480610c7557610c7561161b565b600082815260209020810160001990810180546001600160a01b031916905501905550610caf565b80610ca781611521565b915050610ba2565b506040516001600160a01b03871681526001600160401b038816907ff9bc9d5b5733d904409def43a5ecc888dbdac9a95687780d8fd489d3bb3813fc9060200160405180910390a250505050505050565b600080546001600160401b03168180610d1883611631565b82546001600160401b039182166101009390930a928302928202191691909117909155604080518082018252338082526000602080840182815282548716835260038252858320945190516001600160601b0316600160a01b026001600160a01b03909116179093555492519081529190921692507f464722b4166576d3dcbba877b999bc35cf911f4eaf434b7eba68fa113951d0bf910160405180910390a2506000546001600160401b031690565b6001600160401b038116600090815260036020526040812054819081906060906001600160a01b0316610e0e57604051630fb532db60e11b815260040160405180910390fd5b6001600160401b0385166000908152600360209081526040808320546004835281842080548351818602810186019094528084526001600160601b03600160a01b84041695946001600160a01b03909316939192839190830182828015610e9e57602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610e80575b5050505050905093509350935093509193509193565b6001600160401b0382166000908152600360205260409020546001600160a01b0316610ef357604051630fb532db60e11b815260040160405180910390fd5b6001600160401b03821660009081526003602052604090208054600160a01b90046001600160601b03169082906014610f2c8385611657565b92506101000a8154816001600160601b0302191690836001600160601b03160217905550826001600160401b03167fd39ec07f4e209f627a4c427971473820dc129761ba28de8906bd56f57101d4f8828484610f889190611657565b604080516001600160601b0393841681529290911660208301520160405180910390a2505050565b6001600160401b03821660009081526003602052604090205482906001600160a01b031680610ff257604051630fb532db60e11b815260040160405180910390fd5b336001600160a01b0382161461102657604051636c51fda960e11b81526001600160a01b03821660048201526024016103e0565b6001600160401b0384166000818152600360209081526040918290205482516001600160a01b0388168152600160a01b9091046001600160601b0316918101919091527fe8ed5b475a5b5987aa9165e8731bb78043f39eee32ec5a1169a89e27fcd49815910160405180910390a25050506001600160401b0316600090815260036020526040812055565b60405162461bcd60e51b815260206004820152600f60248201526e1b9bdd081a5b5c1b195b595b9d1959608a1b60448201526000906064016103e0565b6001600160401b03821660009081526004602090815260408083208054825181850281018501909352808352849383018282801561115557602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311611137575b5050505050905060005b81518110156111b757836001600160a01b0316828281518110611184576111846114f5565b60200260200101516001600160a01b0316036111a5576001925050506111be565b806111af81611521565b91505061115f565b5060009150505b92915050565b60006060820161ffff86168352602063ffffffff86168185015260606040850152818551808452608086019150828701935060005b81811015611215578451835293830193918301916001016111f9565b509098975050505050505050565b80356001600160401b038116811461123a57600080fd5b919050565b80356001600160a01b038116811461123a57600080fd5b6000806040838503121561126957600080fd5b61127283611223565b91506112806020840161123f565b90509250929050565b634e487b7160e01b600052604160045260246000fd5b6000806000606084860312156112b457600080fd5b8335925060206112c581860161123f565b925060408501356001600160401b03808211156112e157600080fd5b818701915087601f8301126112f557600080fd5b81358181111561130757611307611289565b8060051b604051601f19603f8301168101818110858211171561132c5761132c611289565b60405291825284820192508381018501918a83111561134a57600080fd5b938501935b828510156113685784358452938501939285019261134f565b8096505050505050509250925092565b803563ffffffff8116811461123a57600080fd5b600080600080600060a086880312156113a457600080fd5b853594506113b460208701611223565b9350604086013561ffff811681146113cb57600080fd5b92506113d960608701611378565b91506113e760808701611378565b90509295509295909350565b6000806040838503121561140657600080fd5b823591506112806020840161123f565b60006020828403121561142857600080fd5b61143182611223565b9392505050565b6000608082016001600160601b038716835260206001600160401b0387168185015260018060a01b0380871660408601526080606086015282865180855260a087019150838801945060005b818110156114a2578551841683529484019491840191600101611484565b50909a9950505050505050505050565b600080604083850312156114c557600080fd5b6114ce83611223565b915060208301356001600160601b03811681146114ea57600080fd5b809150509250929050565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b6000600182016115335761153361150b565b5060010190565b6000604082018483526020604081850152818551808452606086019150828701935060005b8181101561157b5784518352938301939183019160010161155f565b5090979650505050505050565b6000825160005b818110156115a9576020818601810151858301520161158f565b506000920191825250919050565b818103818111156111be576111be61150b565b80820281158282048414176111be576111be61150b565b808201808211156111be576111be61150b565b6001600160601b038281168282160390808211156116145761161461150b565b5092915050565b634e487b7160e01b600052603160045260246000fd5b60006001600160401b0380831681810361164d5761164d61150b565b6001019392505050565b6001600160601b038181168382160190808211156116145761161461150b56fea26469706673582212209745653c0dcb6719c4dd268368881950989721d06292ca30cc24dd655bbac28064736f6c63430008110033";

type VRFCoordinatorV2MockConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: VRFCoordinatorV2MockConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class VRFCoordinatorV2Mock__factory extends ContractFactory {
  constructor(...args: VRFCoordinatorV2MockConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = "VRFCoordinatorV2Mock";
  }

  deploy(
    _baseFee: BigNumberish,
    _gasPriceLink: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<VRFCoordinatorV2Mock> {
    return super.deploy(
      _baseFee,
      _gasPriceLink,
      overrides || {}
    ) as Promise<VRFCoordinatorV2Mock>;
  }
  getDeployTransaction(
    _baseFee: BigNumberish,
    _gasPriceLink: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_baseFee, _gasPriceLink, overrides || {});
  }
  attach(address: string): VRFCoordinatorV2Mock {
    return super.attach(address) as VRFCoordinatorV2Mock;
  }
  connect(signer: Signer): VRFCoordinatorV2Mock__factory {
    return super.connect(signer) as VRFCoordinatorV2Mock__factory;
  }
  static readonly contractName: "VRFCoordinatorV2Mock";
  public readonly contractName: "VRFCoordinatorV2Mock";
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): VRFCoordinatorV2MockInterface {
    return new utils.Interface(_abi) as VRFCoordinatorV2MockInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): VRFCoordinatorV2Mock {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as VRFCoordinatorV2Mock;
  }
}
