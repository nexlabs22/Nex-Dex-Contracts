import { numToBytes32, stringToBytes } from "@chainlink/test-helpers/dist/src/helpers"
import { assert, expect } from "chai"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { network, deployments, ethers, run } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { APIConsumer, LinkToken, MockOracle } from "../../typechain"

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
      let accounts:any

      beforeEach(async () => {
        await deployments.fixture(["mocks", "nftOracle", "exchange"]);
        linkToken = await ethers.getContract("LinkToken")
        const linkTokenAddress: string = linkToken.address
        nftOracle = await ethers.getContract("NftOracle")
        await run("fund-link", { contract: nftOracle.address, linkaddress: linkTokenAddress })
        exchange = await ethers.getContract("Exchange")
        mockOracle = await ethers.getContract("MockOracle")
        accounts = await ethers.provider.getSigner()
      })

      it("Should successfully make an price request and get a result", async () => {
        const [owner, account1, account2] = await ethers.getSigners();
        
        //owner deposit collateral
        await exchange.depositEther({value: toWei('1')});
        const etherAddress = exchange.ETHER()
        let ownerCollateral = await exchange.collateral(etherAddress, owner.address);
        assert.equal(toEther(ownerCollateral), '1.0');

        //account1 deposit collateral
        await exchange.connect(account1).depositEther({value: toWei('2')});
        let Account1Collateral = await exchange.collateral(etherAddress, account1.address);
        assert.equal(toEther(Account1Collateral), '2.0');
        // console.log("balance:", toEther(await exchange.connect(account1).showUsdcBalance()));

        //owner create a bull position
        await exchange.betBullEth(toWei('0.7'),('1'));
        let roundNumber = await exchange.roundNumber();
        let round = await exchange.rounds(roundNumber);
        let bullAmount = round.bullAmount;
        console.log('oldBull:', toEther(ownerCollateral))
        // assert.equal(toEther(bullAmount), '1.0');

        //account1 create a bear position
        await exchange.connect(account1).betBearEth(toWei('1.4'),('1'));
        round = await exchange.rounds(roundNumber);
        let bearAmount = round.bearAmount;
        const isActive = round.isActive;
        console.log('oldBear:', toEther(Account1Collateral))
        // assert.equal(toEther(bearAmount), '2.0');
        assert.equal(isActive, true);
        
        //get start price with 100
        const latestRequestId = await exchange.latestRequestId();
        const value: number = 100;
        await mockOracle.fulfillOracleRequest(latestRequestId, numToBytes32(value));
        
        //increase price to 110
        await exchange.requestPrice();
        const newRequestId = await exchange.latestRequestId();
        const newValue: number = 110;
        await mockOracle.fulfillOracleRequest(newRequestId, numToBytes32(newValue));

        //test old and new price
        const lastId = await exchange.lastRequestId()
        const oldPrice = (await nftOracle.showPrice(lastId)).toNumber()
        assert.equal(oldPrice, 100);
        const latestId = await exchange.latestRequestId()
        const newPrice = (await nftOracle.showPrice(latestId)).toNumber()
        assert.equal(newPrice, 110);
        
        //calculate profit and loss
        await exchange.adjustCollateral();
        round = await exchange.rounds(roundNumber);
        bullAmount = round.bullAmount;
        ownerCollateral = await exchange.collateral(etherAddress, owner.address);
        console.log('newBull:', toEther(ownerCollateral));
        bearAmount = round.bearAmount;
        Account1Collateral = await exchange.collateral(etherAddress, account1.address);
        console.log('newBear:', toEther(Account1Collateral));
      })
    })
