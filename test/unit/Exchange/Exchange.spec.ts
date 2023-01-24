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
  toNumber
} from '../../../utils/basics';

import {
  uint256, 
  int256,
} from "../../../utils/solidity";

import ExchangeContract from "../../../utils/contracts/exchange";
import { AddUsers, InitWorker, PrintContractStatus } from "../../../utils/core/worker";

async function compareResultExchange(pool: any, users?: Array<number>) {
  // in this function, compare the actual value of the smart contract with the expected value of the test pool
  
  const exchange = pool.exchangeContract;
  const usdc = pool.usdcContract;
  // compare the price of contract and test pool
  expect(compareResult(toBigNumber(await exchange.getCurrentExchangePrice()), pool.price)).to.equal(true);

  if (!users) return;
  for (let userId of users) {
    const account = pool.account(userId);
    const userStatus = pool.getUserStatus(account.address, pool.poolState);
    if (!userStatus) break;
    expect(compareResult(toBigNumber(await exchange.uservBaycBalance(account.address)), userStatus.vBaycBalance)).to.equal(true);
    expect(compareResult(toBigNumber(await exchange.uservUsdBalance(account.address)), userStatus.vUsdBalance)).to.equal(true);
    expect(compareResult(toBigNumber(await exchange.collateral(usdc.address, account.address)), userStatus.collateral)).to.equal(true);
    expect(compareResult(toBigNumber(await exchange.getPositionNotional(account.address)), userStatus.notionalValue)).to.equal(true);
    expect(compareResult(toBigNumber(await exchange.getPNL(account.address)), userStatus.pnl)).to.equal(true);
    expect(compareResult(toBigNumber(await exchange.getAccountValue(account.address)), userStatus.accountValue)).to.equal(true);
    expect(compareResult(Number(await exchange.userMargin(account.address)), userStatus.margin, 1)).to.equal(true);

    // comparing these values for each user
    // - user virtual bayc balance
    // - user virtual usd balance
    // - user collateral value
    // - user position notional value
    // - user pnl
    // - user account value
    // - user margin
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

    })
  })