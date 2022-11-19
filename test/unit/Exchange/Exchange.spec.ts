import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from "chai";
import { network, deployments, ethers, run } from "hardhat";
import { developmentChains } from "../../../helper-hardhat-config";
import { LinkToken, Exchange, MockV3Aggregator } from "../../../typechain";
import {
  organizeTestPool,
  SWAP_FEE
} from '../../../utils/exchange';
import {
  compareResult,
  toEther,
  toWeiN
} from '../../../utils/basics';

async function compareResultExchange(pool: any, users?: Array<number>) {
  // in this function, compare the actual value of the smart contract with the expected value of the test pool

  const exchange = pool.exchangeContract;
  const usdc = pool.usdcContract;
  // compare the price of contract and test pool
  expect(compareResult(toEther(await exchange.getCurrentExchangePrice()), pool.price)).to.equal(true);

  if (!users) return;
  for (let userId of users) {
    const userStatus = pool.getUserStatus(userId, pool.poolState);
    if (!userStatus) break;
    expect(compareResult(toEther(await exchange.uservBaycBalance(userStatus.account.address)), userStatus.vBaycBalance)).to.equal(true);
    expect(compareResult(toEther(await exchange.uservUsdBalance(userStatus.account.address)), userStatus.vUsdBalance)).to.equal(true);
    expect(compareResult(toEther(await exchange.collateral(usdc.address, userStatus.account.address)), userStatus.collateral)).to.equal(true);
    expect(compareResult(toEther(await exchange.getPositionNotional(userStatus.account.address)), userStatus.notionalValue)).to.equal(true);
    expect(compareResult(toEther(await exchange.getPNL(userStatus.account.address)), userStatus.pnl)).to.equal(true);
    expect(compareResult(toEther(await exchange.getAccountValue(userStatus.account.address)), userStatus.accountValue)).to.equal(true);
    expect(compareResult(Number(await exchange.userMargin(userStatus.account.address)), userStatus.margin, 1)).to.equal(true);

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

    it("Test hard and partial liquidate for long position", async () => {
      // organize virtual pool to expect smart contract results
      // 2000 - pool price
      // 20 - pool size
      const pool = organizeTestPool(2000, 20, exchange, usdc);
      // get 3 account addresses for test
      const [_, account0, account1, account2] = await ethers.getSigners();

      // add three users with $300, $5000, $5000 collateral
      // in this test, should consider first user
      pool.addUser(account0, 300);
      pool.addUser(account1, 5000);
      pool.addUser(account2, 5000);

      // set the mock price - 2000
      await setOraclePrice(pool.price);
      // init pool in smart contract
      await exchange.initialVirtualPool(toWeiN(pool.poolState.baycSize));
      expect(toEther(await exchange.getCurrentExchangePrice())).to.equal(pool.price);

      // deposit three user's collateral to contract's pool
      const users = pool.userDetail();
      for (let user of users) {
        const { account, collateral } = user;
        await usdc.transfer(account.address, toWeiN(collateral))
        await usdc.connect(account).approve(exchange.address, toWeiN(collateral));
        await exchange.connect(account).depositCollateral(toWeiN(collateral));
        expect(toEther(await exchange.collateral(usdc.address, account.address))).to.equal(collateral);
      }


      const longPositionUSD1 = 490;
      // user0 open long position($490) in contract's pool
      await exchange.connect(pool.account(0)).openLongPosition(toWeiN(longPositionUSD1));


      // open long position in test pool and calculate new pool state
      let newPoolState = pool.openLongPosition(longPositionUSD1);
      // update user0's balance
      pool.updateUserBalance(
        0, {
          baycSize: pool.poolState.baycSize - newPoolState.baycSize,
          usdSize: longPositionUSD1 * (-1)
        }
      );
      // calculate fee of opened position
      const swapFee1 = longPositionUSD1 * SWAP_FEE;
      // reduce the fee from user0's collateral
      pool.updateUserCollateral(0, swapFee1, 'position fee');
      // update test pool state
      pool.poolState = newPoolState;

      // compare two pool's status and user0's status
      await compareResultExchange(pool, [0]);

    

      const shortPositionUSD2 = 4500;
      // user1 open short position($4500) in contract's pool
      await exchange.connect(pool.account(1)).openShortPosition(toWeiN(shortPositionUSD2));

      // open short position in test pool and calculate new pool state
      newPoolState = pool.openShortPosition(shortPositionUSD2);
      // at that time, user0 will be liquidated partially because his margin value is 50% for new pool state
      expect(pool.isPartialLiquidateable(0, newPoolState)).to.equal(true);
      // liquidate user0 partially in test pool
      pool.partialLiquidate(0, newPoolState);

      // calculate pool state again because pool is changed during liquidation
      newPoolState = pool.openShortPosition(shortPositionUSD2);
      // update user1's balance
      pool.updateUserBalance(
        1, {
          baycSize: pool.poolState.baycSize - newPoolState.baycSize,
          usdSize: shortPositionUSD2
        }
      );
      // calculate fee of opened position
      const swapFee2 = shortPositionUSD2 * SWAP_FEE;
      // reduce the fee from user1's collateral
      pool.updateUserCollateral(1, swapFee2, 'position fee');
      // update test pool state
      pool.poolState = newPoolState;

      // compare two pool's status and status of user0 and user1
      await compareResultExchange(pool, [0, 1]);


      
      const shortPositionUSD3 = 7500;
      // user2 open short position($7500) in contract's pool
      await exchange.connect(pool.account(2)).openShortPosition(toWeiN(shortPositionUSD3));

      // open short position in test pool and calculate new pool state
      newPoolState = pool.openShortPosition(shortPositionUSD3);
      // at that time, user0 will be liquidated hardly because his margin value is 38% for new pool state
      expect(pool.isHardLiquidateable(0, newPoolState)).to.equal(true);
      // liquidate user0 hardly in test pool
      pool.hardLiquidate(0, newPoolState);

      // calculate pool state again because pool is changed during liquidation
      newPoolState = pool.openShortPosition(shortPositionUSD3);
      // update user2's balance
      pool.updateUserBalance(
        2, {
          baycSize: pool.poolState.baycSize - newPoolState.baycSize,
          usdSize: shortPositionUSD3
        }
      );
      // calculate fee of opened position
      const swapFee3 = shortPositionUSD3 * SWAP_FEE;
      // reduce the fee from user2's collateral
      pool.updateUserCollateral(2, swapFee3, 'position fee');
      // update test pool state
      pool.poolState = newPoolState;

      // compare two pool's status and status of user0, user1 and user2 
      await compareResultExchange(pool, [0, 1, 2]);

      expect(pool.collateralCheck()).to.equal(true);
      console.log(pool.testReport());
    })

  })