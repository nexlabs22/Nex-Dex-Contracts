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
: describe("Liquidation exchange Unit Tests", async function () {
      let exchange:any
      let nftOracle:any
      let linkToken: LinkToken
      let mockOracle: MockOracle
      let usdc:any
      let accounts:any
      let exchangeInfo:any

      beforeEach(async () => {
        await deployments.fixture(["mocks", "nftOracle", "exchange", "exchangeInfo", "token"]);
        linkToken = await ethers.getContract("LinkToken")
        nftOracle = await ethers.getContract("MockV3AggregatorNft")
        exchange = await ethers.getContract("Exchange")
        usdc = await ethers.getContract("Token")
        exchangeInfo = await ethers.getContract("ExchangeInfo");

        accounts = await ethers.provider.getSigner()
      })

      async function setOraclePrice(newPrice:any){
        await nftOracle.updateAnswer((newPrice*10**18).toString())
        }
      
      it("Test hard liquidate long position", async () => {
        const [owner, account1, account2, account3] = await ethers.getSigners();
        await setOraclePrice(1.5);
        // console.log(toEther(await exchange.showPriceETH()))
        await exchange.initialVirtualPool(toWei('5'));
        //owner deposit collateral
        await usdc.approve(exchange.address, toWei('700'));
        await exchange.depositCollateral(toWei('700'));
        expect(toEther(await exchange.collateral(usdc.address, owner.address))).to.equal('700.0')
        
        //account1 deposit collateral
        await usdc.transfer(account1.address, toWei('1000'))
        await usdc.connect(account1).approve(exchange.address, toWei('1000'));
        await exchange.connect(account1).depositCollateral(toWei('1000'));
        expect(toEther(await exchange.collateral(usdc.address, account1.address))).to.equal('1000.0')

        //account1 deposit collateral
        await usdc.transfer(account2.address, toWei('1000'))
        await usdc.connect(account2).approve(exchange.address, toWei('1000'));
        await exchange.connect(account2).depositCollateral(toWei('1000'));
        expect(toEther(await exchange.collateral(usdc.address, account2.address))).to.equal('1000.0')

        //account3 deposit collateral
        await usdc.transfer(account3.address, toWei('1000'))
        await usdc.connect(account3).approve(exchange.address, toWei('1000'));
        await exchange.connect(account3).depositCollateral(toWei('1000'));
        expect(toEther(await exchange.collateral(usdc.address, account3.address))).to.equal('1000.0')
        
        let minimumBayc = await exchangeInfo.getMinimumLongBaycOut(toWei('1100'))
        await exchange.openLongPosition(toWei('1100'), minimumBayc)
        console.log(toEther(await exchange.getAccountValue(owner.address)));
        console.log(toEther(await exchange.uservBaycBalance(owner.address)));
        console.log(toEther(await exchange.uservUsdBalance(owner.address)));
        const ownerAssetSize = await exchange.uservBaycBalance(owner.address);
        console.log('owner position national 1 :',toEther(await exchange.getPositionNotional(owner.address)));
        console.log('first collateral:', toEther(await exchange.collateral(usdc.address, owner.address)));
        console.log('owner margin 1 :', Number(await exchange.userMargin(owner.address)))
        console.log('p1:', toEther(await exchange.getCurrentExchangePrice()))
        await setOraclePrice(1);
        minimumBayc = await exchangeInfo.getMinimumShortBaycOut(toWei('1200'))
        await exchange.connect(account1).openShortPosition(toWei('1200'), minimumBayc)

        minimumBayc = await exchangeInfo.getMinimumShortBaycOut(toWei('1200'))
        await exchange.connect(account2).openShortPosition(toWei('1200'), minimumBayc)

        minimumBayc = await exchangeInfo.getMinimumShortBaycOut(toWei('1000'))
        await exchange.connect(account3).openShortPosition(toWei('1000'), minimumBayc)
        
        console.log('owner margin 2 :', Number(await exchange.userMargin(owner.address)))
        console.log('owner position national 2 :',toEther(await exchange.getPositionNotional(owner.address)));
        
        console.log('p2:', toEther(await exchange.getCurrentExchangePrice()))
        // console.log('owner unrealized pnl :', toEther(await exchange.))
        console.log(toEther(await exchange.uservBaycBalance(owner.address)));
        console.log(toEther(await exchange.uservUsdBalance(owner.address)));
        // await exchange.closePosition(ownerAssetSize);
        console.log('owner position national 3 :',toEther(await exchange.getPositionNotional(owner.address)));
        console.log('owner margin 3 :', Number(await exchange.userMargin(owner.address)))
        console.log('final collateral:', toEther(await exchange.collateral(usdc.address, owner.address)));
        return
      })

      
      it("Test hard liquidate short position", async () => {
        const [owner, account1, account2, account3] = await ethers.getSigners();
        await setOraclePrice(1.5);
        // console.log(toEther(await exchange.showPriceETH()))
        await exchange.initialVirtualPool(toWei('5'));
        //owner deposit collateral
        await usdc.approve(exchange.address, toWei('500'));
        await exchange.depositCollateral(toWei('500'));
        expect(toEther(await exchange.collateral(usdc.address, owner.address))).to.equal('500.0')
        
        //account1 deposit collateral
        await usdc.transfer(account1.address, toWei('1000'))
        await usdc.connect(account1).approve(exchange.address, toWei('1000'));
        await exchange.connect(account1).depositCollateral(toWei('1000'));
        expect(toEther(await exchange.collateral(usdc.address, account1.address))).to.equal('1000.0')

        //account1 deposit collateral
        await usdc.transfer(account2.address, toWei('1000'))
        await usdc.connect(account2).approve(exchange.address, toWei('1000'));
        await exchange.connect(account2).depositCollateral(toWei('1000'));
        expect(toEther(await exchange.collateral(usdc.address, account2.address))).to.equal('1000.0')

        //account3 deposit collateral
        await usdc.transfer(account3.address, toWei('1000'))
        await usdc.connect(account3).approve(exchange.address, toWei('1000'));
        await exchange.connect(account3).depositCollateral(toWei('1000'));
        expect(toEther(await exchange.collateral(usdc.address, account3.address))).to.equal('1000.0')
        
        let minimumBayc = await exchangeInfo.getMinimumShortBaycOut(toWei('700'))
        await exchange.openShortPosition(toWei('700'), minimumBayc)
        console.log(toEther(await exchange.getAccountValue(owner.address)));
        console.log(toEther(await exchange.uservBaycBalance(owner.address)));
        console.log(toEther(await exchange.uservUsdBalance(owner.address)));
        const ownerAssetSize = await exchange.uservBaycBalance(owner.address);
        console.log('owner position national 1 :',toEther(await exchange.getPositionNotional(owner.address)));
        console.log('first collateral:', toEther(await exchange.collateral(usdc.address, owner.address)));
        console.log('owner margin 1 :', Number(await exchange.userMargin(owner.address)))
        console.log('p1:', toEther(await exchange.getCurrentExchangePrice()))
        await setOraclePrice(1.8);
        minimumBayc = await exchangeInfo.getMinimumLongBaycOut(toWei('500'))
        await exchange.connect(account1).openLongPosition(toWei('500'), minimumBayc)
        minimumBayc = await exchangeInfo.getMinimumLongBaycOut(toWei('700'))
        await exchange.connect(account2).openLongPosition(toWei('700'), minimumBayc)
        console.log('owner margin 2 :', Number(await exchange.userMargin(owner.address)))
        // console.log('is hard liquidatable ? :', await exchange.isHardLiquidateable2(owner.address))
        // await exchange.hardLiquidate(owner.address);
        console.log('p2:', toEther(await exchange.getCurrentExchangePrice()))
        console.log('owner margin 3 :', Number(await exchange.userMargin(owner.address)))
        console.log('owner position national 2 :',toEther(await exchange.getPositionNotional(owner.address)));
        // console.log('owner unrealized pnl :', toEther(await exchange.))
        console.log(toEther(await exchange.uservBaycBalance(owner.address)));
        console.log(toEther(await exchange.uservUsdBalance(owner.address)));
        minimumBayc = await exchangeInfo.getMinimumLongBaycOut(toWei('400'))
        await exchange.connect(account3).openLongPosition(toWei('400'), minimumBayc)
        // await exchange.closePosition(ownerAssetSize);
        console.log('owner position national 3 :',toEther(await exchange.getPositionNotional(owner.address)));
        console.log('final collateral:', toEther(await exchange.collateral(usdc.address, owner.address)));
        return
      })
      
    })