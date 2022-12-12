import { numToBytes32, stringToBytes } from "@chainlink/test-helpers/dist/src/helpers"
import { assert, expect } from "chai"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { network, deployments, ethers, run } from "hardhat"
import { developmentChains, networkConfig } from "../../../helper-hardhat-config"
import { APIConsumer, LinkToken, MockOracle } from "../../../typechain"

const chainId = 31337;
const jobId = ethers.utils.toUtf8Bytes(networkConfig[chainId].jobId!);
const toEther = (e:any) => ethers.utils.formatEther(e);
const toWei = (e: string) => ethers.utils.parseEther(e);

!developmentChains.includes(network.name)
? describe.skip
: describe("Exchange Unit Tests", async function () {
      let exchange:any
      let nftOracle:any
      let linkToken: LinkToken
      let mockOracle: MockOracle
      let usdc:any
      let accounts:any

      beforeEach(async () => {
        await deployments.fixture(["mocks", "nftOracle", "exchange", "token"]);
        // linkToken = await ethers.getContract("LinkToken")
        nftOracle = await ethers.getContract("MockV3AggregatorNft")
        exchange = await ethers.getContract("Exchange")
        usdc = await ethers.getContract("Token")
        accounts = await ethers.provider.getSigner()
      })

      async function setOraclePrice(newPrice:any){
        await nftOracle.updateAnswer((newPrice*10**18).toString())
        }
      
      //call functions
      const getTokenBalance = async (user:any) => toEther(await usdc.balanceOf(user.address))
      const getCollateral = async (user:any) => toEther(await exchange.collateral(usdc.address, user.address))
      const getAccountValue = async (user:any) => toEther(await exchange.getAccountValue(user.address))
      const getNotionalValue = async (user:any) => toEther(await exchange.getPositionNotional(user.address))
      const getPnl = async (user:any) => toEther(await exchange.getPNL(user.address))
      const getMargin = async (user:any) => Number(await exchange.userMargin(user.address))
      const getvUsdBalance = async (user:any) => toEther(await exchange.uservUsdBalance(user.address))
      const getvBaycBalance = async (user:any) => toEther(await exchange.uservBaycBalance(user.address))

      async function printCurrentStatus() {
        const accounts = await ethers.getSigners();
        const result = [];
        for (let i = 0; i < 3; i++) {
          result.push({
            Id: 'User' + i,
            Collateral: await getCollateral(accounts[i]),
            AccountValue: await getAccountValue(accounts[i]),
            NotionalValue: await getNotionalValue(accounts[i]),
            PNL: await getPnl(accounts[i]),
            Margin: await getMargin(accounts[i]),
            VirtuaUsdBalance: await getvUsdBalance(accounts[i]),
            VirtuaBaycBalance: await getvBaycBalance(accounts[i]),
          });
        }
          
          result.push({
            Id: 'Contract',
            Collateral: await getTokenBalance(exchange)
          })
          console.table(result);
        }
      
      it("Test open and close long position", async () => {
        const [owner, account1, account2] = await ethers.getSigners();
        await setOraclePrice(1.48);
        // console.log(toEther(await exchange.showPriceETH()))
        await exchange.initialVirtualPool(toWei('20'));

        console.log('add collateral')
        //owner deposit collateral
        await usdc.approve(exchange.address, toWei('300'));
        await exchange.depositCollateral(toWei('300'));
        expect(toEther(await exchange.collateral(usdc.address, owner.address))).to.equal('300.0')
        
        //account1 deposit collateral
        await usdc.transfer(account1.address, toWei('5000'))
        await usdc.connect(account1).approve(exchange.address, toWei('5000'));
        await exchange.connect(account1).depositCollateral(toWei('5000'));
        expect(toEther(await exchange.collateral(usdc.address, account1.address))).to.equal('5000.0')

        //account2 deposit collateral
        await usdc.transfer(account2.address, toWei('5000'))
        await usdc.connect(account2).approve(exchange.address, toWei('5000'));
        await exchange.connect(account2).depositCollateral(toWei('5000'));
        expect(toEther(await exchange.collateral(usdc.address, account2.address))).to.equal('5000.0')
        

        await printCurrentStatus()
        
        console.log("First, user0 will open Long Position with $490.")
        const minimumBayc = await exchange.getMinimumLongBaycOut(toWei('490'))
        console.log("minimumBayc :", toEther(minimumBayc))
        await exchange.openLongPosition(toWei('490'), minimumBayc)
        console.log('price:', toEther(await exchange.getCurrentExchangePrice()))
        await printCurrentStatus()
        
        console.log("Second, user1 will open Short Position with $4500. At that time, user0 will be liquidated partially because his margin is 50% for new pool state.")
        const minimumBayc1 = await exchange.getMinimumShortBaycOut(toWei('4500'))
        console.log("minimumBayc :", toEther(minimumBayc1))
        await exchange.connect(account1).openShortPosition(toWei('4500'), minimumBayc1)
        console.log('price:', toEther(await exchange.getCurrentExchangePrice()))
        await printCurrentStatus()

        console.log("Third, user2 will open Short Position with $7000 and user0 will be liquidated hardly.")
        const minimumBayc2 = await exchange.getMinimumShortBaycOut(toWei('7000'))
        console.log("minimumBayc :", toEther(minimumBayc2))
        await exchange.connect(account2).openShortPosition(toWei('7000'), minimumBayc2)
        console.log('price:', toEther(await exchange.getCurrentExchangePrice()))
        await printCurrentStatus()
        

        console.log("Finally, user1 will close Position completely, and user2 will be liquidated hardly because of this.")
        const account1BaycBalance = await exchange.uservBaycBalance(account1.address)
        console.log(account1BaycBalance.abs())
        const minimumUsdOut = await exchange.getMinimumLongUsdOut(account1BaycBalance.abs());
        console.log('by liq:', toEther(minimumUsdOut))
        console.log('without liq:',toEther(await exchange.getLongVusdAmountOut(account1BaycBalance.abs())))
        //return
        await exchange.connect(account1).closePositionComplete(minimumUsdOut)
        console.log('price:', toEther(await exchange.getCurrentExchangePrice()))
        await printCurrentStatus()

        console.log('All users withdraw their collateral')
        const collateral0 = await exchange.collateral(usdc.address, owner.address)
        const collateral1 = await exchange.collateral(usdc.address, account1.address)
        const collateral2 = await exchange.collateral(usdc.address, account2.address)
      

        await exchange.withdrawCollateral(collateral0);
        await exchange.connect(account1).withdrawCollateral(collateral1);
        await exchange.connect(account2).withdrawCollateral(collateral2);

        await printCurrentStatus()
      })


      
     
    })