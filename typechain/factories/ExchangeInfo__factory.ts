/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { ExchangeInfo, ExchangeInfoInterface } from "../ExchangeInfo";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "exchangeAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "exchangeAddress",
        type: "address",
      },
    ],
    name: "changeExchangeAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "exchange",
    outputs: [
      {
        internalType: "contract Exchange",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_usdAmount",
        type: "uint256",
      },
    ],
    name: "getMinimumLongBaycOut",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_BaycAmount",
        type: "uint256",
      },
    ],
    name: "getMinimumLongUsdOut",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_usdAmount",
        type: "uint256",
      },
    ],
    name: "getMinimumShortBaycOut",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_BaycAmount",
        type: "uint256",
      },
    ],
    name: "getMinimumShortUsdOut",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b506040516200256c3803806200256c8339810160408190526200003491620000b5565b6200003f3362000065565b600180546001600160a01b0319166001600160a01b0392909216919091179055620000e7565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b600060208284031215620000c857600080fd5b81516001600160a01b0381168114620000e057600080fd5b9392505050565b61247580620000f76000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c8063d2f7265a11610066578063d2f7265a14610100578063d87f8a9514610113578063e56e57ff14610126578063ee2b29f014610139578063f2fde38b1461014c57600080fd5b8063715018a6146100985780638c6adc01146100a25780638da5cb5b146100c8578063989430d4146100ed575b600080fd5b6100a061015f565b005b6100b56100b03660046121a0565b610173565b6040519081526020015b60405180910390f35b6000546001600160a01b03165b6040516001600160a01b0390911681526020016100bf565b6100a06100fb3660046121ce565b610935565b6001546100d5906001600160a01b031681565b6100b56101213660046121a0565b61095f565b6100b56101343660046121a0565b611112565b6100b56101473660046121a0565b6118c5565b6100a061015a3660046121ce565b612078565b6101676120f6565b6101716000612150565b565b600080600160009054906101000a90046001600160a01b03166001600160a01b031663ebfdbcbe6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156101c9573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101ed91906121f2565b90506000600160009054906101000a90046001600160a01b03166001600160a01b0316636d9718386040518163ffffffff1660e01b8152600401602060405180830381865afa158015610244573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061026891906121f2565b905060006102768284612221565b905060006102848685612257565b90506000610292828461227f565b90506000600160009054906101000a90046001600160a01b03166001600160a01b0316634ed6bd1a6040518163ffffffff1660e01b8152600401600060405180830381865afa1580156102e9573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f1916820160405261031191908101906122e1565b905060005b81518110156105865760006001600160a01b031682828151811061033c5761033c6123a6565b60200260200101516001600160a01b0316146105745760015482516000916001600160a01b031690630cdf3cd79085908590811061037c5761037c6123a6565b602002602001015187876040518463ffffffff1660e01b81526004016103a4939291906123bc565b602060405180830381865afa1580156103c1573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906103e591906123dd565b9050801515600103610572576103fb8486612221565b60015484519197506001600160a01b03169063a0852e1390859085908110610425576104256123a6565b60200260200101516040518263ffffffff1660e01b815260040161045891906001600160a01b0391909116815260200190565b602060405180830381865afa158015610475573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061049991906121f2565b6104a39086612257565b94506104af858761227f565b93506104bb8789612221565b60015484519197506001600160a01b03169063a0852e13908590859081106104e5576104e56123a6565b60200260200101516040518263ffffffff1660e01b815260040161051891906001600160a01b0391909116815260200190565b602060405180830381865afa158015610535573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061055991906121f2565b6105639089612257565b975061056f888761227f565b96505b505b8061057e816123ff565b915050610316565b5060005b81518110156108f15760006001600160a01b03168282815181106105b0576105b06123a6565b60200260200101516001600160a01b0316146108df5760015482516000916001600160a01b03169063aa94bcc2908590859081106105f0576105f06123a6565b602002602001015187876040518463ffffffff1660e01b8152600401610618939291906123bc565b602060405180830381865afa158015610635573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061065991906123dd565b90508015156001036108dd5760015483516000916001600160a01b03169063ec31775f9086908690811061068f5761068f6123a6565b602002602001015188886040518463ffffffff1660e01b81526004016106b7939291906123bc565b602060405180830381865afa1580156106d4573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906106f891906121f2565b60015485519192506000916001600160a01b039091169063a0852e1390879087908110610727576107276123a6565b60200260200101516040518263ffffffff1660e01b815260040161075a91906001600160a01b0391909116815260200190565b602060405180830381865afa158015610777573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061079b91906121f2565b13156107ee576107ab8587612221565b96506107b78186612418565b94506107c3858861227f565b95506107cf888a612221565b96506107db8189612418565b97506107e7888861227f565b98506108db565b60015484516000916001600160a01b03169063a0852e1390879087908110610818576108186123a6565b60200260200101516040518263ffffffff1660e01b815260040161084b91906001600160a01b0391909116815260200190565b602060405180830381865afa158015610868573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061088c91906121f2565b12156108db5761089c8587612221565b96506108a88186612257565b94506108b4858861227f565b95506108c0888a612221565b96506108cc8189612257565b97506108d8888861227f565b98505b505b505b806108e9816123ff565b91505061058a565b506108fc8587612221565b9350600061090a8988612257565b90506000610918828761227f565b905060006109268289612418565b9b9a5050505050505050505050565b61093d6120f6565b600180546001600160a01b0319166001600160a01b0392909216919091179055565b600080600160009054906101000a90046001600160a01b03166001600160a01b031663ebfdbcbe6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156109b5573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906109d991906121f2565b90506000600160009054906101000a90046001600160a01b03166001600160a01b0316636d9718386040518163ffffffff1660e01b8152600401602060405180830381865afa158015610a30573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610a5491906121f2565b90506000610a628284612221565b90506000610a708684612257565b90506000610a7e828461227f565b90506000600160009054906101000a90046001600160a01b03166001600160a01b0316634ed6bd1a6040518163ffffffff1660e01b8152600401600060405180830381865afa158015610ad5573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f19168201604052610afd91908101906122e1565b905060005b8151811015610d725760006001600160a01b0316828281518110610b2857610b286123a6565b60200260200101516001600160a01b031614610d605760015482516000916001600160a01b031690630cdf3cd790859085908110610b6857610b686123a6565b602002602001015186886040518463ffffffff1660e01b8152600401610b90939291906123bc565b602060405180830381865afa158015610bad573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610bd191906123dd565b9050801515600103610d5e57610be78585612221565b60015484519197506001600160a01b03169063a0852e1390859085908110610c1157610c116123a6565b60200260200101516040518263ffffffff1660e01b8152600401610c4491906001600160a01b0391909116815260200190565b602060405180830381865afa158015610c61573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610c8591906121f2565b610c8f9085612257565b9350610c9b848761227f565b9450610ca78789612221565b60015484519197506001600160a01b03169063a0852e1390859085908110610cd157610cd16123a6565b60200260200101516040518263ffffffff1660e01b8152600401610d0491906001600160a01b0391909116815260200190565b602060405180830381865afa158015610d21573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610d4591906121f2565b610d4f9089612257565b9750610d5b888761227f565b96505b505b80610d6a816123ff565b915050610b02565b5060005b81518110156110dd5760006001600160a01b0316828281518110610d9c57610d9c6123a6565b60200260200101516001600160a01b0316146110cb5760015482516000916001600160a01b03169063aa94bcc290859085908110610ddc57610ddc6123a6565b602002602001015186886040518463ffffffff1660e01b8152600401610e04939291906123bc565b602060405180830381865afa158015610e21573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610e4591906123dd565b90508015156001036110c95760015483516000916001600160a01b03169063ec31775f90869086908110610e7b57610e7b6123a6565b602002602001015187896040518463ffffffff1660e01b8152600401610ea3939291906123bc565b602060405180830381865afa158015610ec0573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610ee491906121f2565b60015485519192506000916001600160a01b039091169063a0852e1390879087908110610f1357610f136123a6565b60200260200101516040518263ffffffff1660e01b8152600401610f4691906001600160a01b0391909116815260200190565b602060405180830381865afa158015610f63573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610f8791906121f2565b1315610fda57610f978686612221565b9650610fa38187612418565b9550610faf868861227f565b9450610fbb888a612221565b9650610fc78189612418565b9750610fd3888861227f565b98506110c7565b60015484516000916001600160a01b03169063a0852e1390879087908110611004576110046123a6565b60200260200101516040518263ffffffff1660e01b815260040161103791906001600160a01b0391909116815260200190565b602060405180830381865afa158015611054573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061107891906121f2565b12156110c7576110888686612221565b96506110948187612257565b95506110a0868861227f565b94506110ac888a612221565b96506110b88189612257565b97506110c4888861227f565b98505b505b505b806110d5816123ff565b915050610d76565b506110e88587612221565b935060006110f68987612257565b90506000611104828761227f565b90506000610926828a612418565b600080600160009054906101000a90046001600160a01b03166001600160a01b031663ebfdbcbe6040518163ffffffff1660e01b8152600401602060405180830381865afa158015611168573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061118c91906121f2565b90506000600160009054906101000a90046001600160a01b03166001600160a01b0316636d9718386040518163ffffffff1660e01b8152600401602060405180830381865afa1580156111e3573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061120791906121f2565b905060006112158284612221565b905060006112238685612418565b90506000611231828461227f565b90506000600160009054906101000a90046001600160a01b03166001600160a01b0316634ed6bd1a6040518163ffffffff1660e01b8152600401600060405180830381865afa158015611288573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f191682016040526112b091908101906122e1565b905060005b81518110156115255760006001600160a01b03168282815181106112db576112db6123a6565b60200260200101516001600160a01b0316146115135760015482516000916001600160a01b031690630cdf3cd79085908590811061131b5761131b6123a6565b602002602001015187876040518463ffffffff1660e01b8152600401611343939291906123bc565b602060405180830381865afa158015611360573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061138491906123dd565b90508015156001036115115761139a8486612221565b60015484519197506001600160a01b03169063a0852e13908590859081106113c4576113c46123a6565b60200260200101516040518263ffffffff1660e01b81526004016113f791906001600160a01b0391909116815260200190565b602060405180830381865afa158015611414573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061143891906121f2565b6114429086612257565b945061144e858761227f565b935061145a8789612221565b60015484519197506001600160a01b03169063a0852e1390859085908110611484576114846123a6565b60200260200101516040518263ffffffff1660e01b81526004016114b791906001600160a01b0391909116815260200190565b602060405180830381865afa1580156114d4573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906114f891906121f2565b6115029089612257565b975061150e888761227f565b96505b505b8061151d816123ff565b9150506112b5565b5060005b81518110156118905760006001600160a01b031682828151811061154f5761154f6123a6565b60200260200101516001600160a01b03161461187e5760015482516000916001600160a01b03169063aa94bcc29085908590811061158f5761158f6123a6565b602002602001015187876040518463ffffffff1660e01b81526004016115b7939291906123bc565b602060405180830381865afa1580156115d4573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906115f891906123dd565b905080151560010361187c5760015483516000916001600160a01b03169063ec31775f9086908690811061162e5761162e6123a6565b602002602001015188886040518463ffffffff1660e01b8152600401611656939291906123bc565b602060405180830381865afa158015611673573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061169791906121f2565b60015485519192506000916001600160a01b039091169063a0852e13908790879081106116c6576116c66123a6565b60200260200101516040518263ffffffff1660e01b81526004016116f991906001600160a01b0391909116815260200190565b602060405180830381865afa158015611716573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061173a91906121f2565b131561178d5761174a8587612221565b96506117568186612418565b9450611762858861227f565b955061176e888a612221565b965061177a8189612418565b9750611786888861227f565b985061187a565b60015484516000916001600160a01b03169063a0852e13908790879081106117b7576117b76123a6565b60200260200101516040518263ffffffff1660e01b81526004016117ea91906001600160a01b0391909116815260200190565b602060405180830381865afa158015611807573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061182b91906121f2565b121561187a5761183b8587612221565b96506118478186612257565b9450611853858861227f565b955061185f888a612221565b965061186b8189612257565b9750611877888861227f565b98505b505b505b80611888816123ff565b915050611529565b5061189b8587612221565b935060006118a98988612418565b905060006118b7828761227f565b905060006109268883612418565b600080600160009054906101000a90046001600160a01b03166001600160a01b031663ebfdbcbe6040518163ffffffff1660e01b8152600401602060405180830381865afa15801561191b573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061193f91906121f2565b90506000600160009054906101000a90046001600160a01b03166001600160a01b0316636d9718386040518163ffffffff1660e01b8152600401602060405180830381865afa158015611996573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906119ba91906121f2565b905060006119c88284612221565b905060006119d68684612418565b905060006119e4828461227f565b90506000600160009054906101000a90046001600160a01b03166001600160a01b0316634ed6bd1a6040518163ffffffff1660e01b8152600401600060405180830381865afa158015611a3b573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f19168201604052611a6391908101906122e1565b905060005b8151811015611cd85760006001600160a01b0316828281518110611a8e57611a8e6123a6565b60200260200101516001600160a01b031614611cc65760015482516000916001600160a01b031690630cdf3cd790859085908110611ace57611ace6123a6565b602002602001015186886040518463ffffffff1660e01b8152600401611af6939291906123bc565b602060405180830381865afa158015611b13573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611b3791906123dd565b9050801515600103611cc457611b4d8585612221565b60015484519197506001600160a01b03169063a0852e1390859085908110611b7757611b776123a6565b60200260200101516040518263ffffffff1660e01b8152600401611baa91906001600160a01b0391909116815260200190565b602060405180830381865afa158015611bc7573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611beb91906121f2565b611bf59085612257565b9350611c01848761227f565b9450611c0d8789612221565b60015484519197506001600160a01b03169063a0852e1390859085908110611c3757611c376123a6565b60200260200101516040518263ffffffff1660e01b8152600401611c6a91906001600160a01b0391909116815260200190565b602060405180830381865afa158015611c87573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611cab91906121f2565b611cb59089612257565b9750611cc1888761227f565b96505b505b80611cd0816123ff565b915050611a68565b5060005b81518110156120435760006001600160a01b0316828281518110611d0257611d026123a6565b60200260200101516001600160a01b0316146120315760015482516000916001600160a01b03169063aa94bcc290859085908110611d4257611d426123a6565b602002602001015186886040518463ffffffff1660e01b8152600401611d6a939291906123bc565b602060405180830381865afa158015611d87573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611dab91906123dd565b905080151560010361202f5760015483516000916001600160a01b03169063ec31775f90869086908110611de157611de16123a6565b602002602001015187896040518463ffffffff1660e01b8152600401611e09939291906123bc565b602060405180830381865afa158015611e26573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611e4a91906121f2565b60015485519192506000916001600160a01b039091169063a0852e1390879087908110611e7957611e796123a6565b60200260200101516040518263ffffffff1660e01b8152600401611eac91906001600160a01b0391909116815260200190565b602060405180830381865afa158015611ec9573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611eed91906121f2565b1315611f4057611efd8686612221565b9650611f098187612418565b9550611f15868861227f565b9450611f21888a612221565b9650611f2d8189612418565b9750611f39888861227f565b985061202d565b60015484516000916001600160a01b03169063a0852e1390879087908110611f6a57611f6a6123a6565b60200260200101516040518263ffffffff1660e01b8152600401611f9d91906001600160a01b0391909116815260200190565b602060405180830381865afa158015611fba573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611fde91906121f2565b121561202d57611fee8686612221565b9650611ffa8187612257565b9550612006868861227f565b9450612012888a612221565b965061201e8189612257565b975061202a888861227f565b98505b505b505b8061203b816123ff565b915050611cdc565b5061204e8587612221565b9350600061205c8987612418565b9050600061206a828761227f565b905060006109268983612418565b6120806120f6565b6001600160a01b0381166120ea5760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b60648201526084015b60405180910390fd5b6120f381612150565b50565b6000546001600160a01b031633146101715760405162461bcd60e51b815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e657260448201526064016120e1565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6000602082840312156121b257600080fd5b5035919050565b6001600160a01b03811681146120f357600080fd5b6000602082840312156121e057600080fd5b81356121eb816121b9565b9392505050565b60006020828403121561220457600080fd5b5051919050565b634e487b7160e01b600052601160045260246000fd5b80820260008212600160ff1b8414161561223d5761223d61220b565b81810583148215176122515761225161220b565b92915050565b80820182811260008312801582168215821617156122775761227761220b565b505092915050565b60008261229c57634e487b7160e01b600052601260045260246000fd5b600160ff1b8214600019841416156122b6576122b661220b565b500590565b634e487b7160e01b600052604160045260246000fd5b80516122dc816121b9565b919050565b600060208083850312156122f457600080fd5b825167ffffffffffffffff8082111561230c57600080fd5b818501915085601f83011261232057600080fd5b815181811115612332576123326122bb565b8060051b604051601f19603f83011681018181108582111715612357576123576122bb565b60405291825284820192508381018501918883111561237557600080fd5b938501935b8285101561239a5761238b856122d1565b8452938501939285019261237a565b98975050505050505050565b634e487b7160e01b600052603260045260246000fd5b6001600160a01b039390931683526020830191909152604082015260600190565b6000602082840312156123ef57600080fd5b815180151581146121eb57600080fd5b6000600182016124115761241161220b565b5060010190565b81810360008312801583831316838312821617156124385761243861220b565b509291505056fea26469706673582212205718e59e5b2e1884a008f565d9cebd9cfb4669705b8df922402fc5d37ea2801164736f6c63430008110033";

type ExchangeInfoConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ExchangeInfoConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ExchangeInfo__factory extends ContractFactory {
  constructor(...args: ExchangeInfoConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = "ExchangeInfo";
  }

  deploy(
    exchangeAddress: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ExchangeInfo> {
    return super.deploy(
      exchangeAddress,
      overrides || {}
    ) as Promise<ExchangeInfo>;
  }
  getDeployTransaction(
    exchangeAddress: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(exchangeAddress, overrides || {});
  }
  attach(address: string): ExchangeInfo {
    return super.attach(address) as ExchangeInfo;
  }
  connect(signer: Signer): ExchangeInfo__factory {
    return super.connect(signer) as ExchangeInfo__factory;
  }
  static readonly contractName: "ExchangeInfo";
  public readonly contractName: "ExchangeInfo";
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ExchangeInfoInterface {
    return new utils.Interface(_abi) as ExchangeInfoInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ExchangeInfo {
    return new Contract(address, _abi, signerOrProvider) as ExchangeInfo;
  }
}