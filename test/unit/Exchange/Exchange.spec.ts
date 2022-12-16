import { expect } from "chai";
import { network, deployments, ethers, run } from "hardhat";
import { BigNumber as EtherBigNumber } from "ethers";
import BigNumber from "bignumber.js";
import { developmentChains } from "../../../helper-hardhat-config";
import { LinkToken, Exchange, MockV3Aggregator } from "../../../typechain";
import {
  organizeTestPool,
  SWAP_FEE,
  PoolType
} from '../../../utils/exchange';
import {
  compareResult,
  toWeiN,
  toBigNumber,
  BN
} from '../../../utils/basics';
import { UnsignedBigNumber } from "../../../utils/UnsignedBigNumber";

async function compareResultExchange(pool: any, users?: Array<number>) {
  // in this function, compare the actual value of the smart contract with the expected value of the test pool

  const exchange = pool.exchangeContract;
  const usdc = pool.usdcContract;
  // compare the price of contract and test pool
  expect(compareResult(toBigNumber(await exchange.getCurrentExchangePrice()), pool.price)).to.equal(true);

  if (!users) return;
  for (let userId of users) {
    const userStatus = pool.getUserStatus(userId, pool.poolState);
    if (!userStatus) break;
    expect(compareResult(toBigNumber(await exchange.uservBaycBalance(userStatus.account.address)), userStatus.vBaycBalance)).to.equal(true);
    expect(compareResult(toBigNumber(await exchange.uservUsdBalance(userStatus.account.address)), userStatus.vUsdBalance)).to.equal(true);
    expect(compareResult(toBigNumber(await exchange.collateral(usdc.address, userStatus.account.address)), userStatus.collateral)).to.equal(true);
    expect(compareResult(toBigNumber(await exchange.getPositionNotional(userStatus.account.address)), userStatus.notionalValue)).to.equal(true);
    expect(compareResult(toBigNumber(await exchange.getPNL(userStatus.account.address)), userStatus.pnl)).to.equal(true);
    expect(compareResult(toBigNumber(await exchange.getAccountValue(userStatus.account.address)), userStatus.accountValue)).to.equal(true);
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
    const longPositionUSD1 =  BN(490)
    const shortPositionUSD2 =  BN(4500)
    const shortPositionUSD3 =  BN(7500)

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
      pool = organizeTestPool( BN(2000),  BN(20), exchange, usdc);
      // get 3 account addresses for test
      const [_, account0, account1, account2] = await ethers.getSigners();

      // add three users with $300, $5000, $5000 collateral
      // in this test, should consider first user
      pool.addUser(account0,  BN(300));
      pool.addUser(account1,  BN(5000));
      pool.addUser(account2,  BN(5000));

      // set the mock price - 2000
      await setOraclePrice(pool.price);
      // init pool in smart contract
      await exchange.initialVirtualPool(toWeiN(pool.poolState.vBaycPoolSize.value));
      expect(compareResult(toBigNumber(await exchange.getCurrentExchangePrice()), pool.price)).to.equal(true);

      // deposit three user's collateral to contract's pool
      const users = pool.userDetail();
      for (let user of users) {
        const { account, collateral } = user;
        await usdc.transfer(account.address, toWeiN(collateral))
        await usdc.connect(account).approve(exchange.address, toWeiN(collateral));
        await exchange.connect(account).depositCollateral(toWeiN(collateral));
        expect(compareResult(toBigNumber(await exchange.collateral(usdc.address, account.address)), collateral)).to.equal(true);
      }

      console.log('Initial State');
      pool.printCurrentStatus();
    })

    async function setOraclePrice(newPrice: any) {
      await nftOracle.updateAnswer((1 * 10 ** 18).toString());
      await priceFeed.updateAnswer((newPrice * 10 ** 8).toString());
    }

    // it.skip("Test hard and partial liquidate for long position", async () => {
    //   // user0 open long position($490) in contract's pool
    //   let minimumBayc = await exchange.getMinimumLongBaycOut(toWeiN(longPositionUSD1.toNumber()));
    //   await exchange.connect(pool.account(0)).openLongPosition(toWeiN(longPositionUSD1.toNumber()), minimumBayc);

    //   // open long position in test pool and calculate new pool state
    //   let newPoolState: PoolType = pool.addVusdBalance(longPositionUSD1);
    //   // update user0's balance
    //   pool.updateUserBalance(
    //     0, 
    //     pool.poolState.vBaycPoolSize.value.minus(newPoolState.vBaycPoolSize.value),
    //     longPositionUSD1.negated()
    //   );
    //   // calculate fee of opened position
    //   const swapFee1 = UnsignedBigNumber(longPositionUSD1.multipliedBy(SWAP_FEE));
    //   // reduce the fee from user0's collateral
    //   pool.withdrawCollateralByFee(0, swapFee1);
    //   // update test pool state
    //   pool.poolState = newPoolState;

    //   console.log('First Step Result - User0 opened Long Position $490');
    //   pool.printCurrentStatus();
    //   // compare two pool's status and user0's status
    //   await compareResultExchange(pool, [0]);



    //   // user1 open short position($4500) in contract's pool
    //   await exchange.connect(pool.account(1)).openShortPosition(toWeiN(shortPositionUSD2.toNumber()));

    //   // open short position in test pool and calculate new pool state
    //   newPoolState = pool.removeVusdBalance(shortPositionUSD2);
    //   // at that time, user0 will be liquidated partially because his margin value is 50% for new pool state
    //   expect(pool.isPartialLiquidatable(0, newPoolState)).to.equal(true);
    //   // liquidate user0 partially in test pool
    //   pool.partialLiquidate(0, newPoolState);

    //   // calculate pool state again because pool is changed during liquidation
    //   newPoolState = pool.removeVusdBalance(shortPositionUSD2);
    //   // update user1's balance
    //   pool.updateUserBalance(
    //     1, 
    //     pool.poolState.vBaycPoolSize.value.minus(newPoolState.vBaycPoolSize.value),
    //     shortPositionUSD2
    //   );
    //   // calculate fee of opened position
    //   const swapFee2 = UnsignedBigNumber(shortPositionUSD2.multipliedBy(SWAP_FEE));
    //   // reduce the fee from user1's collateral
    //   pool.withdrawCollateralByFee(1, swapFee2);
    //   // update test pool state
    //   pool.poolState = newPoolState;
      
    //   console.log('Second Step Result - User1 opened Short Position $4500');
    //   pool.printCurrentStatus();
    //   // compare two pool's status and status of user0 and user1
    //   await compareResultExchange(pool, [0, 1]);


    //   // user2 open short position($7500) in contract's pool
    //   await exchange.connect(pool.account(2)).openShortPosition(toWeiN(shortPositionUSD3.toNumber()));

    //   // open short position in test pool and calculate new pool state
    //   newPoolState = pool.removeVusdBalance(shortPositionUSD3);
    //   // at that time, user0 will be liquidated hardly because his margin value is 38% for new pool state
    //   expect(pool.isHardLiquidatable(0, newPoolState)).to.equal(true);
    //   // liquidate user0 hardly in test pool
    //   pool.hardLiquidate(0, newPoolState);

    //   // calculate pool state again because pool is changed during liquidation
    //   newPoolState = pool.removeVusdBalance(shortPositionUSD3);
    //   // update user2's balance
    //   pool.updateUserBalance(
    //     2, 
    //     pool.poolState.vBaycPoolSize.value.minus(newPoolState.vBaycPoolSize.value),
    //     shortPositionUSD3
    //   );
    //   // calculate fee of opened position
    //   const swapFee3 = UnsignedBigNumber(shortPositionUSD3.multipliedBy(SWAP_FEE));
    //   // reduce the fee from user2's collateral
    //   pool.withdrawCollateralByFee(2, swapFee3);
    //   // update test pool state
    //   pool.poolState = newPoolState;

    //   console.log('Third Step Result - User2 opened Short Position $7500');
    //   pool.printCurrentStatus();
    //   // compare two pool's status and status of user0, user1 and user2 
    //   await compareResultExchange(pool, [0, 1, 2]);


    //   await exchange.connect(pool.account(1)).closePositionComplete();

    //   newPoolState = pool.addBaycBalance(pool.getUservBaycBalance(1));

    //   expect(pool.isHardLiquidatable(2, newPoolState)).to.equal(true);

    //   pool.hardLiquidate(2, newPoolState);

    //   newPoolState = pool.addBaycBalance(pool.getUservBaycBalance(1));

    //   let usdBaycValue: BigNumber = pool.getVusdAmountOut(pool.getUservBaycBalance(1), pool.poolState); // 4415.8664
    //   let usdBalance: BigNumber = pool.getUservUsdBalance(1); // 4500

    //   expect(usdBaycValue.lt(usdBalance)).to.equal(true);
    //   const pnl = UnsignedBigNumber(usdBalance.minus(usdBaycValue));
    //   pool.addUserCollateral(1, pnl, 'trading profit');
    //   pool.updateUserBalance(
    //     1, 
    //     pool.getUservBaycBalance(1).negated(),
    //     pool.getUservUsdBalance(1).negated()
    //   );
    //   const swapFee4 = UnsignedBigNumber(usdBaycValue.multipliedBy(SWAP_FEE));
    //   pool.withdrawCollateralByFee(1, swapFee4);
    //   pool.poolState = newPoolState;

    //   console.log('Last Step Result - User1 closed position $4500');
    //   pool.printCurrentStatus();

    //   await compareResultExchange(pool, [0, 1, 2]);

    //   let withdraw0 = pool.getUserCollateral(0);
    //   let withdraw1 = pool.getUserCollateral(1);
    //   let withdraw2 = pool.getUserCollateral(2);
    //   await exchange.connect(pool.account(0)).withdrawCollateral(EtherBigNumber.from(withdraw0.multipliedBy(10**18).toFixed(0)));
    //   await exchange.connect(pool.account(1)).withdrawCollateral(EtherBigNumber.from(withdraw1.multipliedBy(10**18).toFixed(0)));
    //   await exchange.connect(pool.account(2)).withdrawCollateral(EtherBigNumber.from(withdraw2.multipliedBy(10**18).toFixed(0)));

    //   pool.withdrawCollateral(0, UnsignedBigNumber(withdraw0));
    //   pool.withdrawCollateral(1, UnsignedBigNumber(withdraw1));
    //   pool.withdrawCollateral(2, UnsignedBigNumber(withdraw2));

    //   pool.printCurrentStatus();
    // });

    it("Test hard and partial liquidate for long position", async () => {
      // user0 open long position($490) in contract's pool
      let minimumBayc1 = await exchange.getMinimumLongBaycOut(toWeiN(longPositionUSD1.toNumber()));
      let minimumBayc2 = pool.getMinimumLongBaycOut(UnsignedBigNumber(longPositionUSD1));
      expect(compareResult(toBigNumber(minimumBayc1), minimumBayc2.value)).to.equal(true);

      await exchange.connect(pool.account(0)).openLongPosition(toWeiN(longPositionUSD1.toNumber()), minimumBayc1);
      pool.openLongPosition(0, BN(longPositionUSD1), minimumBayc2.value);

      console.log('First Step Result - User0 opened Long Position $490');
      pool.printCurrentStatus();
      // compare two pool's status and user0's status
      await compareResultExchange(pool, [0]);

      // user1 open short position($4500) in contract's pool
      minimumBayc1 = await exchange.getMinimumShortBaycOut(toWeiN(shortPositionUSD2.toNumber()));
      minimumBayc2 = pool.getMinimumShortBaycOut(UnsignedBigNumber(shortPositionUSD2));
      expect(compareResult(toBigNumber(minimumBayc1), minimumBayc2.value)).to.equal(true);

      await exchange.connect(pool.account(1)).openShortPosition(toWeiN(shortPositionUSD2.toNumber()), minimumBayc1);
      pool.openShortPosition(1, BN(shortPositionUSD2), minimumBayc2.value);

      console.log('Second Step Result - User1 opened Short Position $4500');
      pool.printCurrentStatus();
      // compare two pool's status and status of user0 and user1
      await compareResultExchange(pool, [0, 1]);


      // user2 open short position($7500) in contract's pool
      minimumBayc1 = await exchange.getMinimumShortBaycOut(toWeiN(shortPositionUSD3.toNumber()));
      minimumBayc2 = pool.getMinimumShortBaycOut(UnsignedBigNumber(shortPositionUSD3));
      expect(compareResult(toBigNumber(minimumBayc1), minimumBayc2.value)).to.equal(true);

      await exchange.connect(pool.account(2)).openShortPosition(toWeiN(shortPositionUSD3.toNumber()), minimumBayc1);
      pool.openShortPosition(2, BN(shortPositionUSD3), minimumBayc2.value);

      console.log('Third Step Result - User2 opened Short Position $7500');
      pool.printCurrentStatus();
      // compare two pool's status and status of user0, user1 and user2 
      await compareResultExchange(pool, [0, 1, 2]);


      minimumBayc1 = await exchange.getMinimumShortBaycOut(toWeiN(shortPositionUSD3.toNumber()));
      minimumBayc2 = pool.getMinimumShortBaycOut(UnsignedBigNumber(shortPositionUSD3));
      expect(compareResult(toBigNumber(minimumBayc1), minimumBayc2.value)).to.equal(true);

      await exchange.connect(pool.account(1)).closePositionComplete(minimumBayc1);
      pool.closePositionComplete(1, minimumBayc2.value);

      console.log('Last Step Result - User1 closed position $4500');
      pool.printCurrentStatus();
      await compareResultExchange(pool, [0, 1, 2]);


      let withdraw0 = pool.getUserCollateral(0);
      let withdraw1 = pool.getUserCollateral(1);
      let withdraw2 = pool.getUserCollateral(2);
      await exchange.connect(pool.account(0)).withdrawCollateral(EtherBigNumber.from(withdraw0.multipliedBy(10**18).toFixed(0)));
      await exchange.connect(pool.account(1)).withdrawCollateral(EtherBigNumber.from(withdraw1.multipliedBy(10**18).toFixed(0)));
      await exchange.connect(pool.account(2)).withdrawCollateral(EtherBigNumber.from(withdraw2.multipliedBy(10**18).toFixed(0)));

      pool.withdrawCollateral(0, UnsignedBigNumber(withdraw0));
      pool.withdrawCollateral(1, UnsignedBigNumber(withdraw1));
      pool.withdrawCollateral(2, UnsignedBigNumber(withdraw2));

      pool.printCurrentStatus();
    });
  })