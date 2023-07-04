import { expect } from "chai";
import { network, deployments, ethers, run } from "hardhat";
import { ContractReceipt, ContractTransaction, BigNumber as EtherBigNumber } from "ethers";
import { developmentChains } from "../../../helper-hardhat-config";
import { LinkToken, Exchange, MockV3Aggregator, MockApiOracle } from "../../../typechain";
import {
  compareResult,
  toWei,
  toWeiN,
  toBigNumber,
  toWeiBigNumber,
  toEtherBigNumber,
  WeitoNumber
} from '../../../utils/basics';

import {
  uint256, 
  int256,
} from "../../../utils/solidity";
import { utils } from 'ethers';

import ExchangeContract from "../../../utils/contracts/exchange";
import { AddUsers, GetContractByAddress, InitWorker, PrintContractStatus } from "../../../utils/core/worker";
import { AirdropToken } from "../../../utils/solidity/contract";
import { numToBytes32 } from "@chainlink/test-helpers/dist/src/helpers";
import { formatBytes32String } from "ethers/lib/utils";

async function compareResultExchange(contract: any, testContract: any) {
  // compare the price of two contracts
  expect(compareResult(
    toBigNumber(await contract.getCurrentExchangePrice()), 
    testContract.getCurrentExchangePrice()
  )).to.equal(true);

  // compare Asset virtual pool size
  expect(compareResult(
    toBigNumber(await contract.vAssetPoolSize()), 
    testContract.vAssetPoolSize()
  )).to.equal(true);

  // compare usd virtual pool size
  expect(compareResult(
    toBigNumber(await contract.vUsdPoolSize()), 
    testContract.vUsdPoolSize()
  )).to.equal(true);

  const users = testContract.__getAllUsers();
  for (const user of users) {

    // compare virtual collateral of each user
    expect(compareResult(
      toBigNumber(await contract.virtualCollateral(user)), 
      testContract.virtualCollateral(user)
    )).to.equal(true);

    // compare virtual usd balance of each user
    expect(compareResult(
      toBigNumber(await contract.uservUsdBalance(user)), 
      testContract.uservUsdBalance(user)
    )).to.equal(true);

    // compare virtual Asset balance of each user
    expect(compareResult(
      toBigNumber(await contract.uservAssetBalance(user)), 
      testContract.uservAssetBalance(user)
    )).to.equal(true);

    // compare real collateral of each user
    expect(compareResult(
      toBigNumber(await contract.collateral(testContract.usdc,  user)), 
      testContract.collateral[testContract.usdc][user]
    )).to.equal(true);
  }
}

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Exchange Unit Tests", async function () {
    let exchange: Exchange
    let exchangeInfo:any
    let nftOracle: MockV3Aggregator
    let priceFeed: MockV3Aggregator
    let linkToken: LinkToken
    let mockOracle: MockApiOracle
    let usdc: any

    const longPositionUSD1 =  int256(490)
    const shortPositionUSD2 =  int256(4500)
    const shortPositionUSD3 =  int256(7500)

    const latestPrice = 100
    const latestFundingRate = 10
    let date = new Date();
    let timestamp = date.getTime();

    beforeEach(async () => {
      await deployments.fixture(["mocks", "nftOracle", "exchange", "exchangeInfo", "token"]);
      linkToken = await ethers.getContract("LinkToken");
      nftOracle = await ethers.getContract("MockV3AggregatorNft");
      priceFeed = await ethers.getContract("MockV3Aggregator");
      exchange = await ethers.getContract("Exchange");
      exchangeInfo = await ethers.getContract("ExchangeInfo");
      mockOracle = await ethers.getContract("MockApiOracle")
      usdc = await ethers.getContract("Token");

      //fund link
      await run("fund-link", { contract: exchangeInfo.address, linkaddress: linkToken.address })
      //set exchange info
      await exchange.setExchangeInfo(exchangeInfo.address);

    })

    function numToBytes(num:number) {
      const value = ethers.BigNumber.from(num.toString());
      const bytes32Value = ethers.utils.hexZeroPad(value.toHexString(), 32);
      return bytes32Value
    }

    async function setOraclePrice(newPrice: any) {
      // await nftOracle.updateAnswer((1 * 10 ** 18).toString());
      // await priceFeed.updateAnswer((newPrice * 10 ** 8).toString());
      const transaction: ContractTransaction = await exchangeInfo.requestFundingRate();
      const transactionReceipt: ContractReceipt = await transaction.wait(1);
      if (!transactionReceipt.events) return
      const requestId: string = transactionReceipt?.events[0].topics[1]
      await mockOracle.fulfillOracleFundingRateRequest(requestId, numToBytes(latestPrice*1e18), numToBytes(timestamp), numToBytes(latestFundingRate));
      // await mockOracle.fulfillOracleFundingRateRequest(requestId, formatBytes32String((newPrice * 10 ** 18).toString()), numToBytes32(timestamp), numToBytes32(latestFundingRate));
      // console.log(Number(await exchange.oraclePrice()))
    }

    it("", async () => {
      const [owner, account0, account1, account2] = await ethers.getSigners();
      InitWorker(owner.address);
      AddUsers([
        {
          name: "Deployer",
          address: owner.address
        }, {
          name: "User0",
          address: account0.address
        }, {
          name: "User1",
          address: account1.address
        }, {
          name: "User2",
          address: account2.address
        }
      ])

      const contract = ExchangeContract({address: exchange.address, usdc: usdc.address, account: owner.address});

      await setOraclePrice(2000);

      // compare the price of two contracts
      return;
      await exchange.initialVirtualPool(toWei('20'));


      contract.initialVirtualPool(uint256(toWeiBigNumber(20)));

      console.log("exchange price:", toBigNumber((await exchange.getCurrentExchangePrice())))
      console.log("contract price:", ((contract.getCurrentExchangePrice())))
      return;
      expect(compareResult(
        toBigNumber(await exchange.getCurrentExchangePrice()), 
        contract.getCurrentExchangePrice()
      )).to.equal(true);
      return;

      await usdc.transfer(account0.address, toWei('300'))
      await usdc.connect(account0).approve(exchange.address, toWei('300'));
      await exchange.connect(account0).depositCollateral(toWei('300'));
      AirdropToken(
        GetContractByAddress(account0.address),
        usdc.address,
        uint256(toWeiBigNumber(300))
      )
      contract.connect(account0).depositCollateral(uint256(toWeiBigNumber(300)))

      await usdc.transfer(account1.address, toWei('5000'))
      await usdc.connect(account1).approve(exchange.address, toWei('5000'));
      await exchange.connect(account1).depositCollateral(toWei('5000'));
      AirdropToken(
        GetContractByAddress(account1.address),
        usdc.address,
        uint256(toWeiBigNumber(5000))
      )
      contract.connect(account1).depositCollateral(uint256(toWeiBigNumber(5000)))

      await usdc.transfer(account2.address, toWei('5000'))
      await usdc.connect(account2).approve(exchange.address, toWei('5000'));
      await exchange.connect(account2).depositCollateral(toWei('5000'));
      AirdropToken(
        GetContractByAddress(account2.address),
        usdc.address,
        uint256(toWeiBigNumber(5000))
      )
      contract.connect(account2).depositCollateral(uint256(toWeiBigNumber(5000)))

      PrintContractStatus(contract)


      // user0 open long position($490) in contract's pool
      let minimumAsset1 = await exchangeInfo.getMinimumLongAssetOut(toWeiN(longPositionUSD1.toNumber()));
      // let minimumAsset2 = contract.getMinimumLongAssetOut(uint256(toWeiBigNumber(longPositionUSD1)));
      // expect(compareResult(toBigNumber(minimumAsset1), minimumAsset2)).to.equal(true);

      await exchange.connect(account0).openLongPosition(toWeiN(longPositionUSD1.toNumber()), minimumAsset1);
      contract.connect(account0).openLongPosition(uint256(toWeiBigNumber(longPositionUSD1)), 0);

      console.log('First Step Result - User0 opened Long Position $490');
      PrintContractStatus(contract)
      await compareResultExchange(exchange, contract)


      // user1 open short position($4500) in contract's pool
      minimumAsset1 = await exchangeInfo.getMinimumShortAssetOut(toWeiN(shortPositionUSD2.toNumber()));
      // minimumAsset2 = contract.getMinimumShortAssetOut(uint256(toWeiBigNumber(shortPositionUSD2)));
      // expect(compareResult(toBigNumber(minimumAsset1), minimumAsset2)).to.equal(true);

      await exchange.connect(account1).openShortPosition(toWeiN(shortPositionUSD2.toNumber()), minimumAsset1);
      contract.connect(account1).openShortPosition(uint256(toWeiBigNumber(shortPositionUSD2)), 0);

      console.log('Second Step Result - User1 opened Short Position $4500');
      PrintContractStatus(contract)
      await compareResultExchange(exchange, contract)


      // user2 open short position($7500) in contract's pool
      minimumAsset1 = await exchangeInfo.getMinimumShortAssetOut(toWeiN(shortPositionUSD3.toNumber()));
      // minimumAsset2 = contract.getMinimumShortAssetOut(uint256(toWeiBigNumber(shortPositionUSD3)));
      // expect(compareResult(toBigNumber(minimumAsset1), minimumAsset2)).to.equal(true);

      await exchange.connect(account2).openShortPosition(toWeiN(shortPositionUSD3.toNumber()), minimumAsset1);
      contract.connect(account2).openShortPosition(uint256(toWeiBigNumber(shortPositionUSD3)), 0);

      console.log('Third Step Result - User2 opened Short Position $7500');
      PrintContractStatus(contract)
      await compareResultExchange(exchange, contract)

      
      // user1 close position($4500)
      minimumAsset1 = await exchangeInfo.getMinimumShortAssetOut(toWeiN(shortPositionUSD2.toNumber()));
      // minimumAsset2 = contract.getMinimumShortAssetOut(uint256(toWeiBigNumber(shortPositionUSD2)));
      // expect(compareResult(toBigNumber(minimumAsset1), minimumAsset2.value)).to.equal(true);

      await exchange.connect(account1).closePositionComplete(minimumAsset1);
      contract.connect(account1).closePositionComplete(0);

      console.log('Last Step Result - User1 closed position $4500');
      PrintContractStatus(contract)
      await compareResultExchange(exchange, contract)


      // withdraw all collateral
      let withdraw0 = await exchange.collateral(usdc.address, account0.address);
      let withdraw1 = await exchange.collateral(usdc.address, account1.address);
      let withdraw2 = await exchange.collateral(usdc.address, account2.address);
      await exchange.connect(account0).withdrawCollateral(withdraw0);
      await exchange.connect(account1).withdrawCollateral(withdraw1);
      await exchange.connect(account2).withdrawCollateral(withdraw2);

      contract.connect(account0).withdrawCollateral(toBigNumber(withdraw0));
      contract.connect(account1).withdrawCollateral(toBigNumber(withdraw1));
      contract.connect(account2).withdrawCollateral(toBigNumber(withdraw2));

      PrintContractStatus(contract)
      await compareResultExchange(exchange, contract)
    })
  })