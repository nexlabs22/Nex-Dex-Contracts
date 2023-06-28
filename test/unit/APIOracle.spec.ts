import { numToBytes32, stringToBytes, toBytes32String } from "@chainlink/test-helpers/dist/src/helpers"
import { assert, expect } from "chai"
import { BigNumber, ContractReceipt, ContractTransaction, Signer } from "ethers"
// import { network, deployments, ethers, run } from "hardhat"
import { network, ethers, run, deployments } from "hardhat"
// import { developmentChains } from "../../helper-hardhat-config"
import { ExchangeInfo, LinkToken, MockApiOracle, MockOracle, MockV3Aggregator, Token } from "../../typechain"
import { Exchange } from "../../typechain"

describe("GameOracle Unit Tests", async function () {
    const { deploy, log, get } = deployments
    //   let apiConsumer: ApiConsumer
      let linkToken: LinkToken
      let exchange: Exchange
      let exchangeInfo: ExchangeInfo
      let deployer: Signer
      let deployerAddress: string
      let mockOracle: MockApiOracle
      let usdc: Token

      const jobId = ethers.utils.toUtf8Bytes("29fa9aa13bf1468788b7cc4a500a45b8"); //test job id
      const fee = "100000000000000000" // fee = 0.1 linkToken
      
      const latestPrice = 100
      const latestFundingRate = 10
      let date = new Date();
      let timestamp = date.getTime();

      async function requestFundingRate() {
        const transaction: ContractTransaction = await exchangeInfo.requestFundingRate();
        const transactionReceipt: ContractReceipt = await transaction.wait(1);
        if (!transactionReceipt.events) return
        const requestId: string = transactionReceipt.events[0].topics[1];
        return requestId;
      }

      


      async function changeOracleFundingRateData(requestId:string) {
        await exchangeInfo.fulfillFundingRate(requestId, numToBytes32(latestPrice), numToBytes32(timestamp), numToBytes32(latestFundingRate));
      }

      


      beforeEach(async () => {
        await deployments.fixture(["mocks", "exchange", "exchangeInfo", "token"]);
        // [deployer] = await ethers.getSigners();
        // deployerAddress = await deployer.getAddress();
        linkToken = await ethers.getContract("LinkToken");
        exchange = await ethers.getContract("Exchange");
        exchangeInfo = await ethers.getContract("ExchangeInfo");
        mockOracle = await ethers.getContract("MockApiOracle")
        usdc = await ethers.getContract("Token")
        await exchange.setExchangeInfo(exchangeInfo.address)
        await run("fund-link", { contract: exchangeInfo.address, linkaddress: linkToken.address })
       
        await linkToken.transfer( exchangeInfo.address, fee);
      })
      
    
      
      it("Should successfully make a request and get a result", async () => {
        console.log("HHH", Number(await linkToken.balanceOf(exchangeInfo.address)))
        // return 
        const date = new Date();
        
        const transaction: ContractTransaction = await exchangeInfo.requestFundingRate();
        
        const transactionReceipt: ContractReceipt = await transaction.wait(1);
        if (!transactionReceipt.events) return
        const requestId: string = transactionReceipt.events[0].topics[1]
        // const abiCoder = new ethers.utils.AbiCoder;
        // let data = abiCoder.encode([ "bytes32", "uint8", "uint8", "uint8" ], [numToBytes32(gameId), "1", "2", "1"]);
        await mockOracle.fulfillOracleFundingRateRequest(requestId, numToBytes32(latestPrice), numToBytes32(timestamp), numToBytes32(latestFundingRate));
        // const volume = await gameOracle.getGamesResolved(requestId, 0)
        assert.equal(Number(await exchange.oraclePrice()), latestPrice);
        assert.equal(Number(await exchange.lastFundingRateTime()), timestamp);
        assert.equal(Number(await exchange.lastFundingRateAmount()), latestFundingRate);
        
      });

      
    })