import { expect } from "chai";
import { network, deployments, ethers, run } from "hardhat";
import { BigNumber as EtherBigNumber } from "ethers";
import { developmentChains } from "../../../helper-hardhat-config";
import { LinkToken, Exchange, MockV3Aggregator } from "../../../typechain";
import {
  organizeTestPool,
} from '../../../utils/exchange';
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

import ExchangeContract from "../../../utils/contracts/exchange";
import { AddUsers, InitWorker, PrintContractStatus } from "../../../utils/core/worker";

async function compareResultExchange(contract: any, testContract: any) {
  // compare the price of two contracts
  expect(compareResult(
    toBigNumber(await contract.getCurrentExchangePrice()), 
    testContract.getCurrentExchangePrice()
  )).to.equal(true);

  // compare bayc virtual pool size
  expect(compareResult(
    toBigNumber(await contract.vBaycPoolSize()), 
    testContract.vBaycPoolSize()
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

    // compare virtual bayc balance of each user
    expect(compareResult(
      toBigNumber(await contract.uservBaycBalance(user)), 
      testContract.uservBaycBalance(user)
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
    let nftOracle: MockV3Aggregator
    let priceFeed: MockV3Aggregator
    let linkToken: LinkToken
    let usdc: any

    const longPositionUSD1 =  int256(490)
    const shortPositionUSD2 =  int256(4500)
    const shortPositionUSD3 =  int256(7500)

    beforeEach(async () => {
      await deployments.fixture(["mocks", "nftOracle", "exchange", "token"]);
      linkToken = await ethers.getContract("LinkToken");
      nftOracle = await ethers.getContract("MockV3AggregatorNft");
      priceFeed = await ethers.getContract("MockV3Aggregator");
      exchange = await ethers.getContract("Exchange");
      usdc = await ethers.getContract("Token");

    })

    async function setOraclePrice(newPrice: any) {
      await nftOracle.updateAnswer((1 * 10 ** 18).toString());
      await priceFeed.updateAnswer((newPrice * 10 ** 8).toString());
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
      await exchange.initialVirtualPool(toWei('20'));
      contract.initialVirtualPool(uint256(toWeiBigNumber(20)));

      await usdc.transfer(account0.address, toWei('300'))
      await usdc.connect(account0).approve(exchange.address, toWei('300'));
      await exchange.connect(account0).depositCollateral(toWei('300'));
      contract.connect(account0).depositCollateral(uint256(toWeiBigNumber(300)))

      await usdc.transfer(account1.address, toWei('5000'))
      await usdc.connect(account1).approve(exchange.address, toWei('5000'));
      await exchange.connect(account1).depositCollateral(toWei('5000'));
      contract.connect(account1).depositCollateral(uint256(toWeiBigNumber(5000)))

      await usdc.transfer(account2.address, toWei('5000'))
      await usdc.connect(account2).approve(exchange.address, toWei('5000'));
      await exchange.connect(account2).depositCollateral(toWei('5000'));
      contract.connect(account2).depositCollateral(uint256(toWeiBigNumber(5000)))

      PrintContractStatus(contract)


      // user0 open long position($490) in contract's pool
      let minimumBayc1 = await exchange.getMinimumLongBaycOut(toWeiN(longPositionUSD1.toNumber()));
      let minimumBayc2 = contract.getMinimumLongBaycOut(uint256(toWeiBigNumber(longPositionUSD1)));
      expect(compareResult(toBigNumber(minimumBayc1), minimumBayc2)).to.equal(true);

      await exchange.connect(account0).openLongPosition(toWeiN(longPositionUSD1.toNumber()), minimumBayc1);
      contract.connect(account0).openLongPosition(uint256(toWeiBigNumber(longPositionUSD1)), minimumBayc2);

      console.log('First Step Result - User0 opened Long Position $490');
      PrintContractStatus(contract)
      await compareResultExchange(exchange, contract)


      // user1 open short position($4500) in contract's pool
      minimumBayc1 = await exchange.getMinimumShortBaycOut(toWeiN(shortPositionUSD2.toNumber()));
      minimumBayc2 = contract.getMinimumShortBaycOut(uint256(toWeiBigNumber(shortPositionUSD2)));
      expect(compareResult(toBigNumber(minimumBayc1), minimumBayc2)).to.equal(true);

      await exchange.connect(account1).openShortPosition(toWeiN(shortPositionUSD2.toNumber()), minimumBayc1);
      contract.connect(account1).openShortPosition(uint256(toWeiBigNumber(shortPositionUSD2)), minimumBayc2);

      console.log('Second Step Result - User1 opened Short Position $4500');
      PrintContractStatus(contract)
      await compareResultExchange(exchange, contract)


      // user2 open short position($7500) in contract's pool
      minimumBayc1 = await exchange.getMinimumShortBaycOut(toWeiN(shortPositionUSD3.toNumber()));
      minimumBayc2 = contract.getMinimumShortBaycOut(uint256(toWeiBigNumber(shortPositionUSD3)));
      expect(compareResult(toBigNumber(minimumBayc1), minimumBayc2)).to.equal(true);

      await exchange.connect(account2).openShortPosition(toWeiN(shortPositionUSD3.toNumber()), minimumBayc1);
      contract.connect(account2).openShortPosition(uint256(toWeiBigNumber(shortPositionUSD3)), minimumBayc2);

      console.log('Third Step Result - User2 opened Short Position $7500');
      PrintContractStatus(contract)
      await compareResultExchange(exchange, contract)

      
      // user1 close position($4500)
      minimumBayc1 = await exchange.getMinimumShortBaycOut(toWeiN(shortPositionUSD2.toNumber()));
      minimumBayc2 = contract.getMinimumShortBaycOut(uint256(toWeiBigNumber(shortPositionUSD2)));
      expect(compareResult(toBigNumber(minimumBayc1), minimumBayc2.value)).to.equal(true);

      await exchange.connect(account1).closePositionComplete(minimumBayc1);
      contract.connect(account1).closePositionComplete(minimumBayc2);

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