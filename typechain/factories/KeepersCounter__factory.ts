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
  KeepersCounter,
  KeepersCounterInterface,
} from "../KeepersCounter";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "updateInterval",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "checkUpkeep",
    outputs: [
      {
        internalType: "bool",
        name: "upkeepNeeded",
        type: "bool",
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "counter",
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
    name: "interval",
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
    name: "lastTimeStamp",
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
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "performUpkeep",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60a060405234801561001057600080fd5b5060405161041b38038061041b83398101604081905261002f9161003f565b6080524260015560008055610058565b60006020828403121561005157600080fd5b5051919050565b6080516103a26100796000396000818160bc015261016401526103a26000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c80633f3b3b271461005c5780634585e33b1461007857806361bc221a1461008d5780636e04ff0d14610096578063947a36fb146100b7575b600080fd5b61006560015481565b6040519081526020015b60405180910390f35b61008b610086366004610199565b6100de565b005b61006560005481565b6100a96100a4366004610221565b61015e565b60405161006f9291906102d2565b6100657f000000000000000000000000000000000000000000000000000000000000000081565b60006100f86040518060200160405280600081525061015e565b509050806101445760405162461bcd60e51b8152602060048201526015602482015274151a5b59481a5b9d195c9d985b081b9bdd081b595d605a1b604482015260640160405180910390fd5b42600190815560005461015691610340565b600055505050565b600060607f0000000000000000000000000000000000000000000000000000000000000000600154426101919190610359565b119150915091565b600080602083850312156101ac57600080fd5b823567ffffffffffffffff808211156101c457600080fd5b818501915085601f8301126101d857600080fd5b8135818111156101e757600080fd5b8660208285010111156101f957600080fd5b60209290920196919550909350505050565b634e487b7160e01b600052604160045260246000fd5b60006020828403121561023357600080fd5b813567ffffffffffffffff8082111561024b57600080fd5b818401915084601f83011261025f57600080fd5b8135818111156102715761027161020b565b604051601f8201601f19908116603f011681019083821181831017156102995761029961020b565b816040528281528760208487010111156102b257600080fd5b826020860160208301376000928101602001929092525095945050505050565b821515815260006020604081840152835180604085015260005b81811015610308578581018301518582016060015282016102ec565b506000606082860101526060601f19601f830116850101925050509392505050565b634e487b7160e01b600052601160045260246000fd5b808201808211156103535761035361032a565b92915050565b818103818111156103535761035361032a56fea2646970667358221220d966bc0e50f905b5d8e640f803a8fdaaa2855097fc7f56f7c95735db2b2b7a7564736f6c63430008110033";

type KeepersCounterConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: KeepersCounterConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class KeepersCounter__factory extends ContractFactory {
  constructor(...args: KeepersCounterConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = "KeepersCounter";
  }

  deploy(
    updateInterval: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<KeepersCounter> {
    return super.deploy(
      updateInterval,
      overrides || {}
    ) as Promise<KeepersCounter>;
  }
  getDeployTransaction(
    updateInterval: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(updateInterval, overrides || {});
  }
  attach(address: string): KeepersCounter {
    return super.attach(address) as KeepersCounter;
  }
  connect(signer: Signer): KeepersCounter__factory {
    return super.connect(signer) as KeepersCounter__factory;
  }
  static readonly contractName: "KeepersCounter";
  public readonly contractName: "KeepersCounter";
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): KeepersCounterInterface {
    return new utils.Interface(_abi) as KeepersCounterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): KeepersCounter {
    return new Contract(address, _abi, signerOrProvider) as KeepersCounter;
  }
}
