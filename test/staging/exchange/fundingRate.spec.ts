import { numToBytes32, stringToBytes } from "@chainlink/test-helpers/dist/src/helpers"
import { assert, expect } from "chai"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { network, deployments, ethers, run } from "hardhat"
import { developmentChains, networkConfig } from "../../../helper-hardhat-config"
import { APIConsumer, LinkToken, MockApiOracle, MockOracle } from "../../../typechain"

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
      let mockOracle: MockApiOracle
      let usdc:any
      let accounts:any
      let exchangeInfo:any

      beforeEach(async () => {
        await deployments.fixture(["mocks", "nftOracle", "exchange", "token", "exchangeInfo"]);
        linkToken = await ethers.getContract("LinkToken")
        nftOracle = await ethers.getContract("MockV3AggregatorNft")
        exchange = await ethers.getContract("Exchange")
        
        usdc = await ethers.getContract("Token")
        exchangeInfo = await ethers.getContract("ExchangeInfo");
        mockOracle = await ethers.getContract("MockApiOracle")
        usdc = await ethers.getContract("Token")
        accounts = await ethers.provider.getSigner()

        //fund link
        await run("fund-link", { contract: exchangeInfo.address, linkaddress: linkToken.address })
        //set exchange info
        await exchange.setExchangeInfo(exchangeInfo.address);
      })

      function numToBytes(num:number) {
        const value = ethers.BigNumber.from(num.toLocaleString('fullwide', { useGrouping: false }));
        const bytes32Value = ethers.utils.hexZeroPad(value.toHexString(), 32);
        return bytes32Value
      }

      const latestPrice = 100
      const latestFundingRate = 10
      let date = new Date();
      let timestamp = date.getTime();

      async function setOraclePrice(newPrice: any) {
        // await nftOracle.updateAnswer((1 * 10 ** 18).toString())
        // await priceFeed.updateAnswer((newPrice * 10 ** 18).toLocaleString('fullwide', {useGrouping:false}))
        const transaction: ContractTransaction = await exchangeInfo.requestFundingRate();
        const transactionReceipt: ContractReceipt = await transaction.wait(1);
        if (!transactionReceipt.events) return
        const requestId: string = transactionReceipt?.events[0].topics[1]
        await mockOracle.fulfillOracleFundingRateRequest(requestId, numToBytes(newPrice*10**18), numToBytes(timestamp), numToBytes(latestFundingRate));
      }
      
      it("Positive funding rate", async () => {
        const [owner, account1, account2, account3] = await ethers.getSigners();
        await setOraclePrice(1500);
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
        
        let minimumAsset = await exchangeInfo.getMinimumLongAssetOut(toWei('1000'))
        await exchange.openLongPosition(toWei('1000'), minimumAsset)

        minimumAsset = await exchangeInfo.getMinimumShortAssetOut(toWei('130'))
        await exchange.connect(account1).openShortPosition(toWei('130'), minimumAsset)
        minimumAsset = await exchangeInfo.getMinimumShortAssetOut(toWei('600'))
        await exchange.connect(account2).openShortPosition(toWei('600'), minimumAsset)
        console.log(toEther(await exchange.uservAssetBalance(owner.address)))
        await setOraclePrice(2300);
        
        await exchange.setFundingRate();
        console.log('ownerFuningReward', toEther(await exchange.virtualCollateral(owner.address)))
        console.log('account1FuningReward', toEther(await exchange.virtualCollateral(account1.address)))
        console.log('account2FuningReward', toEther(await exchange.virtualCollateral(account2.address)))
        
      })


      it("Negative funding rate", async () => {
        const [owner, account1, account2, account3] = await ethers.getSigners();
        await setOraclePrice(1500);
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
        
        let minimumAsset = await exchangeInfo.getMinimumLongAssetOut(toWei('1000'))
        await exchange.openLongPosition(toWei('1000'), minimumAsset)
        minimumAsset = await exchangeInfo.getMinimumShortAssetOut(toWei('130'))
        await exchange.connect(account1).openShortPosition(toWei('130'), minimumAsset)
        
        minimumAsset = await exchangeInfo.getMinimumShortAssetOut(toWei('600'))
        await exchange.connect(account2).openShortPosition(toWei('600'), minimumAsset)
        console.log(toEther(await exchange.uservAssetBalance(owner.address)))
        await setOraclePrice(1000);
        // console.log(toEther(await exchange.setFundingRate2()));
        // return
        await exchange.setFundingRate();
        console.log('ownerFuningReward', toEther(await exchange.virtualCollateral(owner.address)))
        console.log('account1FuningReward', toEther(await exchange.virtualCollateral(account1.address)))
        console.log('account2FuningReward', toEther(await exchange.virtualCollateral(account2.address)))
        
      })

      
    })