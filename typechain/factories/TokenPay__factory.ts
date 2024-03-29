/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { TokenPay, TokenPayInterface } from "../TokenPay";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "balance",
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
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenAmount",
        type: "uint256",
      },
    ],
    name: "pay",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b506102fd806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063c40768761461003b578063e3d670d714610050575b600080fd5b61004e610049366004610240565b610075565b005b61006361005e36600461026a565b6101b3565b60405190815260200160405180910390f35b6040516370a0823160e01b815230600482015281906001600160a01b038416906370a0823190602401602060405180830381865afa1580156100bb573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906100df919061028c565b101561013d5760405162461bcd60e51b815260206004820152602360248201527f636f6e747261637420646f65736e74206861766520656e6f7567682062616c616044820152626e636560e81b606482015260840160405180910390fd5b60405163a9059cbb60e01b8152336004820152602481018290526001600160a01b0383169063a9059cbb906044016020604051808303816000875af115801561018a573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101ae91906102a5565b505050565b6040516370a0823160e01b81523060048201526000906001600160a01b038316906370a0823190602401602060405180830381865afa1580156101fa573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061021e919061028c565b92915050565b80356001600160a01b038116811461023b57600080fd5b919050565b6000806040838503121561025357600080fd5b61025c83610224565b946020939093013593505050565b60006020828403121561027c57600080fd5b61028582610224565b9392505050565b60006020828403121561029e57600080fd5b5051919050565b6000602082840312156102b757600080fd5b8151801515811461028557600080fdfea26469706673582212208e541a4bef6b558b9853afeb695e5abac9c6e4dc8f75d89a90bd36f6b8ef042a64736f6c63430008110033";

type TokenPayConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: TokenPayConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class TokenPay__factory extends ContractFactory {
  constructor(...args: TokenPayConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = "TokenPay";
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<TokenPay> {
    return super.deploy(overrides || {}) as Promise<TokenPay>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): TokenPay {
    return super.attach(address) as TokenPay;
  }
  connect(signer: Signer): TokenPay__factory {
    return super.connect(signer) as TokenPay__factory;
  }
  static readonly contractName: "TokenPay";
  public readonly contractName: "TokenPay";
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): TokenPayInterface {
    return new utils.Interface(_abi) as TokenPayInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): TokenPay {
    return new Contract(address, _abi, signerOrProvider) as TokenPay;
  }
}
