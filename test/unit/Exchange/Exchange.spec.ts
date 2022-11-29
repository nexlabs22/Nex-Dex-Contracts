import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from "chai";
import { network, deployments, ethers, run } from "hardhat";
import { developmentChains } from "../../../helper-hardhat-config";
import { LinkToken, Exchange, MockV3Aggregator } from "../../../typechain";
import {
  organizeTestPool,
  SWAP_FEE,
  PoolType
} from '../../../utils/exchange';
import {
  compareResult,
  toEther,
  toWeiN,
  UnsignedInt
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


    let pool: any
    const longPositionUSD1 = 490
    const shortPositionUSD2 = 4500
    const shortPositionUSD3 = 7500

    beforeEach(async () => {
      await deployments.fixture(["mocks", "nftOracle", "exchange", "token"]);
      linkToken = await ethers.getContract("LinkToken");
      nftOracle = await ethers.getContract("MockV3AggregatorNft");
      priceFeed = await ethers.getContract("MockV3Aggregator");
      exchange = await ethers.getContract("Exchange");
      usdc = await ethers.getContract("Token");


      const description = "\
      -------------------------------------------------------------------\n\
      Test for Exchange Smart Contract\n\
      Three Users: User0($300) User1($5000) User2($500)\n\
      \n\
      - First, user0 will open Long Position with $490. \n\
      - Second, user1 will open Short Position with $4500. \n\
          At that time, user0 will be liquidated partially because his margin is 50% for new pool state. \n\
      - Third, user2 will open Short Position with $7000 and user0 will be liquidated hardly. \n\
      - Finally, user1 will close Position completely, and user2 will be liquidated hardly because of this.\n\
      --------------------------------------------------------------------";
      console.log(description);

      // organize virtual pool to expect smart contract results
      // 2000 - pool price
      // 20 - pool size
      pool = organizeTestPool(2000, 20, exchange, usdc);
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
      await exchange.initialVirtualPool(toWeiN(pool.poolState.vBaycPoolSize.value));
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

      console.log('Initial State');
      pool.printCurrentStatus();
    })

    async function setOraclePrice(newPrice: any) {
      await nftOracle.updateAnswer((1 * 10 ** 18).toString());
      await priceFeed.updateAnswer((newPrice * 10 ** 8).toString());
    }

    it("Test hard and partial liquidate for long position", async () => {
      // user0 open long position($490) in contract's pool
      await exchange.connect(pool.account(0)).openLongPosition(toWeiN(longPositionUSD1));

      // open long position in test pool and calculate new pool state
      let newPoolState: PoolType = pool.addVusdBalance(longPositionUSD1);
      // update user0's balance
      pool.updateUserBalance(
        0, 
        pool.poolState.vBaycPoolSize.value - newPoolState.vBaycPoolSize.value,
        longPositionUSD1 * (-1)
      );
      // calculate fee of opened position
      const swapFee1 = longPositionUSD1 * SWAP_FEE;
      // reduce the fee from user0's collateral
      pool.updateUserCollateral(0, swapFee1, 'open position fee');
      // update test pool state
      pool.poolState = newPoolState;

      // compare two pool's status and user0's status
      await compareResultExchange(pool, [0]);

      console.log('First Step Result - User0 opened Long Position $490');
      pool.printCurrentStatus();



      // user1 open short position($4500) in contract's pool
      await exchange.connect(pool.account(1)).openShortPosition(toWeiN(shortPositionUSD2));

      // open short position in test pool and calculate new pool state
      newPoolState = pool.removeVusdBalance(shortPositionUSD2);
      // at that time, user0 will be liquidated partially because his margin value is 50% for new pool state
      expect(pool.isPartialLiquidatable(0, newPoolState)).to.equal(true);
      // liquidate user0 partially in test pool
      pool.partialLiquidate(0, newPoolState);

      // calculate pool state again because pool is changed during liquidation
      newPoolState = pool.removeVusdBalance(shortPositionUSD2);
      // update user1's balance
      pool.updateUserBalance(
        1, 
        pool.poolState.vBaycPoolSize.value - newPoolState.vBaycPoolSize.value,
        shortPositionUSD2
      );
      // calculate fee of opened position
      const swapFee2 = shortPositionUSD2 * SWAP_FEE;
      // reduce the fee from user1's collateral
      pool.updateUserCollateral(1, swapFee2, 'open position fee');
      // update test pool state
      pool.poolState = newPoolState;

      // compare two pool's status and status of user0 and user1
      await compareResultExchange(pool, [0, 1]);

      console.log('Second Step Result - User1 opened Short Position $4500');
      pool.printCurrentStatus();


      // user2 open short position($7500) in contract's pool
      await exchange.connect(pool.account(2)).openShortPosition(toWeiN(shortPositionUSD3));

      // open short position in test pool and calculate new pool state
      newPoolState = pool.removeVusdBalance(shortPositionUSD3);
      // at that time, user0 will be liquidated hardly because his margin value is 38% for new pool state
      expect(pool.isHardLiquidatable(0, newPoolState)).to.equal(true);
      // liquidate user0 hardly in test pool
      pool.hardLiquidate(0, newPoolState);

      // calculate pool state again because pool is changed during liquidation
      newPoolState = pool.removeVusdBalance(shortPositionUSD3);
      // update user2's balance
      pool.updateUserBalance(
        2, 
        pool.poolState.vBaycPoolSize.value - newPoolState.vBaycPoolSize.value,
        shortPositionUSD3
      );
      // calculate fee of opened position
      const swapFee3 = shortPositionUSD3 * SWAP_FEE;
      // reduce the fee from user2's collateral
      pool.updateUserCollateral(2, swapFee3, 'open position fee');
      // update test pool state
      pool.poolState = newPoolState;

      // compare two pool's status and status of user0, user1 and user2 
      await compareResultExchange(pool, [0, 1, 2]);

      console.log('Third Step Result - User2 opened Short Position $7500');
      pool.printCurrentStatus();


      await exchange.connect(pool.account(1)).closePositionComplete();

      newPoolState = pool.addBaycBalance(pool.getUservBaycBalance(1));

      expect(pool.isHardLiquidatable(2, newPoolState)).to.equal(true);

      pool.hardLiquidate(2, newPoolState);

      newPoolState = pool.addBaycBalance(pool.getUservBaycBalance(1));

      let usdBaycValue = pool.getVusdAmountOut(pool.getUservBaycBalance(1), pool.poolState); // 4415.8664
      let usdBalance = pool.getUservUsdBalance(1); // 4500

      expect(usdBaycValue < usdBalance).to.equal(true);
      let pnl = usdBalance - usdBaycValue;
      pool.updateUserCollateral(1, -pnl, 'trading profit');
      pool.updateUserBalance(
        1, 
        - pool.getUservBaycBalance(1),
        - pool.getUservUsdBalance(1)
      );
      const swapFee4 = usdBaycValue * SWAP_FEE;
      pool.updateUserCollateral(1, swapFee4, 'close position fee');
      pool.poolState = newPoolState;
      await compareResultExchange(pool, [0, 1, 2]);

      console.log('Last Step Result - User1 closed position $4500');
      pool.printCurrentStatus();

      let withdraw0 = pool.getUserCollateral(0) - 0.1;
      let withdraw1 = pool.getUserCollateral(1) - 0.1;
      let withdraw2 = pool.getUserCollateral(2) - 0.1;
      await exchange.connect(pool.account(0)).withdrawCollateral(toWeiN(withdraw0));
      await exchange.connect(pool.account(1)).withdrawCollateral(toWeiN(withdraw1));
      try {
        await exchange.connect(pool.account(2)).withdrawCollateral(toWeiN(withdraw2));
      } catch (err) {
        expect((err as Error).message).to.equal("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
      }
      // console.log(`Users withdrawed $${withdraw0 + withdraw1 + withdraw2} from contract.`);
      // console.log(`Diff: ${withdraw0 + withdraw1 + withdraw2 - 10300}`);
    });

    it("Test hard and partial liquidate for long position", async () => {
      // user0 open long position($490) in contract's pool
      await exchange.connect(pool.account(0)).openLongPosition(toWeiN(longPositionUSD1));
      pool.openLongPosition(0, longPositionUSD1);

      // compare two pool's status and user0's status
      await compareResultExchange(pool, [0]);

      console.log('First Step Result - User0 opened Long Position $490');
      pool.printCurrentStatus();



      // user1 open short position($4500) in contract's pool
      await exchange.connect(pool.account(1)).openShortPosition(toWeiN(shortPositionUSD2));
      pool.openShortPosition(1, shortPositionUSD2);

      // compare two pool's status and status of user0 and user1
      await compareResultExchange(pool, [0, 1]);

      console.log('Second Step Result - User1 opened Short Position $4500');
      pool.printCurrentStatus();


      // user2 open short position($7500) in contract's pool
      await exchange.connect(pool.account(2)).openShortPosition(toWeiN(shortPositionUSD3));
      pool.openShortPosition(2, shortPositionUSD3);

      // compare two pool's status and status of user0, user1 and user2 
      await compareResultExchange(pool, [0, 1, 2]);

      console.log('Third Step Result - User2 opened Short Position $7500');
      pool.printCurrentStatus();


      await exchange.connect(pool.account(1)).closePositionComplete();
      pool.closePositionComplete(1);

      await compareResultExchange(pool, [0, 1, 2]);

      console.log('Last Step Result - User1 closed position $4500');
      pool.printCurrentStatus();

      let withdraw0 = pool.getUserCollateral(0) - 0.1;
      let withdraw1 = pool.getUserCollateral(1) - 0.1;
      let withdraw2 = pool.getUserCollateral(2) - 0.1;
      await exchange.connect(pool.account(0)).withdrawCollateral(toWeiN(withdraw0));
      await exchange.connect(pool.account(1)).withdrawCollateral(toWeiN(withdraw1));
      try {
        await exchange.connect(pool.account(2)).withdrawCollateral(toWeiN(withdraw2));
      } catch (err) {
        expect((err as Error).message).to.equal("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
      }
      // console.log(`Users withdrawed $${withdraw0 + withdraw1 + withdraw2} from contract.`);
      // console.log(`Diff: ${withdraw0 + withdraw1 + withdraw2 - 10300}`);
    });
  })