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
        linkToken = await ethers.getContract("LinkToken")
        nftOracle = await ethers.getContract("MockV3AggregatorNft")
        exchange = await ethers.getContract("Exchange")
        usdc = await ethers.getContract("Token")
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
        await usdc.approve(exchange.address, toWei('600'));
        await exchange.depositCollateral(toWei('600'));
        expect(toEther(await exchange.collateral(usdc.address, owner.address))).to.equal('600.0')
        
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
        
        await exchange.openLongPosition(toWei('1000'))
        console.log(toEther(await exchange.getAccountValue(owner.address)));
        console.log(toEther(await exchange.uservBaycBalance(owner.address)));
        console.log(toEther(await exchange.uservUsdBalance(owner.address)));
        const ownerAssetSize = await exchange.uservBaycBalance(owner.address);
        console.log('owner position national 1 :',toEther(await exchange.getPositionNotional(owner.address)));
        console.log('first collateral:', toEther(await exchange.collateral(usdc.address, owner.address)));
        console.log('owner margin 1 :', Number(await exchange.userMargin(owner.address)))
        console.log('p1:', toEther(await exchange.getCurrentExchangePrice()))
        await setOraclePrice(1);
        await exchange.connect(account1).openShortPosition(toWei('800'))
        await exchange.connect(account2).openShortPosition(toWei('800'))
        console.log('owner margin 2 :', Number(await exchange.userMargin(owner.address)))
        console.log('owner account pnl 2 :',toEther(await exchange.getPNL(owner.address)));
        console.log('owner account value 2 :',toEther(await exchange.getAccountValue(owner.address)));
        console.log('owner collateral 2 :',toEther(await exchange.collateral(usdc.address, owner.address)));
        // return
        await exchange.connect(account3).openShortPosition(toWei('500'))

        console.log('owner margin 3 :', Number(await exchange.userMargin(owner.address)))
        console.log('owner account value 3 :',toEther(await exchange.getAccountValue(owner.address)));
        console.log('owner account pnl 3 :',toEther(await exchange.getPNL(owner.address)));
        console.log('owner virtual collateral 3 :',toEther(await exchange.virtualCollateral(owner.address)));
        console.log('owner collateral 3 :',toEther(await exchange.collateral(usdc.address, owner.address)));
        console.log('owner position national 3 :',toEther(await exchange.getPositionNotional(owner.address)));
        console.log('owner vusdc pool size 3 :',toEther(await exchange.uservUsdBalance(owner.address)));
        console.log('owner vBayc pool size 3 :',toEther(await exchange.uservBaycBalance(owner.address)));
      })

      
      it("Test hard liquidate short position", async () => {
        const [owner, account1, account2, account3] = await ethers.getSigners();
        await setOraclePrice(1.5);
        // console.log(toEther(await exchange.showPriceETH()))
        await exchange.initialVirtualPool(toWei('10'));
        //owner deposit collateral
        await usdc.approve(exchange.address, toWei('600'));
        await exchange.depositCollateral(toWei('600'));
        expect(toEther(await exchange.collateral(usdc.address, owner.address))).to.equal('600.0')
        
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
        // await setOraclePrice(1.2);
        await exchange.openShortPosition(toWei('800'))
        console.log(toEther(await exchange.getAccountValue(owner.address)));
        console.log(toEther(await exchange.uservBaycBalance(owner.address)));
        console.log(toEther(await exchange.uservUsdBalance(owner.address)));
        const ownerAssetSize = await exchange.uservBaycBalance(owner.address);
        console.log('owner position national 1 :',toEther(await exchange.getPositionNotional(owner.address)));
        console.log('first collateral:', toEther(await exchange.collateral(usdc.address, owner.address)));
        console.log('owner margin 1 :', Number(await exchange.userMargin(owner.address)))
        console.log('p1:', toEther(await exchange.getCurrentExchangePrice()))
        await setOraclePrice(1.8);
        // return
        await exchange.connect(account1).openLongPosition(toWei('800'))
        await exchange.connect(account2).openLongPosition(toWei('500'))
        console.log('owner margin 2 :', Number(await exchange.userMargin(owner.address)))
        console.log('owner account pnl 2 :',toEther(await exchange.getPNL(owner.address)));
        console.log('owner account value 2 :',toEther(await exchange.getAccountValue(owner.address)));
        console.log('owner collateral 2 :',toEther(await exchange.collateral(usdc.address, owner.address)));
        // return
        await setOraclePrice(2.2);
        await exchange.connect(account3).openLongPosition(toWei('900'))

        console.log('owner margin 3 :', Number(await exchange.userMargin(owner.address)))
        console.log('owner account value 3 :',toEther(await exchange.getAccountValue(owner.address)));
        console.log('owner account pnl 3 :',toEther(await exchange.getPNL(owner.address)));
        console.log('owner virtual collateral 3 :',toEther(await exchange.virtualCollateral(owner.address)));
        console.log('owner collateral 3 :',toEther(await exchange.collateral(usdc.address, owner.address)));
        console.log('owner position national 3 :',toEther(await exchange.getPositionNotional(owner.address)));
        console.log('owner vusdc pool size 3 :',toEther(await exchange.uservUsdBalance(owner.address)));
        console.log('owner vBayc pool size 3 :',toEther(await exchange.uservBaycBalance(owner.address)));
      })
      
    })