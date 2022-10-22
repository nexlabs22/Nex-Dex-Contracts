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
      let usdc:any
      let accounts:any

      beforeEach(async () => {
        await deployments.fixture(["mocks", "nftOracle", "exchange", "token"]);
        linkToken = await ethers.getContract("LinkToken")
        const linkTokenAddress: string = linkToken.address
        nftOracle = await ethers.getContract("NftOracle")
        await run("fund-link", { contract: nftOracle.address, linkaddress: linkTokenAddress })
        exchange = await ethers.getContract("Exchange")
        mockOracle = await ethers.getContract("MockOracle")
        usdc = await ethers.getContract("Token")
        accounts = await ethers.provider.getSigner()
      })

      it("Should successfully make an price request and get a result", async () => {
        const [owner, account1, account2] = await ethers.getSigners();
        await exchange.initialVirtualPool(toWei('1000'), toWei('100000'));
        //owner deposit collateral
        await usdc.approve(exchange.address, toWei('1000'));
        await exchange.depositCollateral(toWei('1000'));
        expect(toEther(await exchange.collateral(usdc.address, owner.address))).to.equal('1000')
        
        //account1 deposit collateral
        await usdc.transfer(account1.address, toWei('1000'))
        await usdc.connect(account1).approve(exchange.address, toWei('1000'));
        await exchange.connect(account1).depositCollateral(toWei('1000'));
        expect(toEther(await exchange.collateral(usdc.address, account1.address))).to.equal('1000')
        
        await exchange.requestPrice();
        const newRequestId = await exchange.latestRequestId();
        const newValue: any = toWei('110');
        await mockOracle.fulfillOracleRequest(newRequestId, numToBytes32(newValue));
        await exchange.openLongPosition(toWei('100'))
        console.log(toEther(await exchange.getAccountValue(owner.address)));
        console.log(toEther(await exchange.uservBaycBalance(owner.address)));
        console.log(toEther(await exchange.uservUsdBalance(owner.address)));
        const ownerAssetSize = await exchange.uservBaycBalance(owner.address);
        
        await exchange.connect(account1).openShortPosition(toWei('300'))
        await exchange.closePosition(ownerAssetSize);
        console.log(toEther(await exchange.uservBaycBalance(owner.address)));
        console.log(toEther(await exchange.uservUsdBalance(owner.address)));
        console.log('final collateral:', toEther(await exchange.collateral(usdc.address, owner.address)));



        // console.log((await exchange.isPriceIntheRightRange2(toWei('71'), toWei('10000'))))
        // console.log(toEther(await exchange.oraclePrice()))
        // console.log(toEther(await exchange.collateral(usdc.address, owner.address)))
        // console.log(toEther(await exchange.vUsdPoolSize()))
        /*
        //owner deposit collateral
        await exchange.depositEther({value: toWei('10')});
        const etherAddress = exchange.ETHER()
        let ownerCollateral = await exchange.collateral(etherAddress, owner.address);
        assert.equal(toEther(ownerCollateral), '10.0');

        //account1 deposit collateral
        await exchange.connect(account1).depositEther({value: toWei('20')});
        let Account1Collateral = await exchange.collateral(etherAddress, account1.address);
        assert.equal(toEther(Account1Collateral), '20.0');
        // console.log("balance:", toEther(await exchange.connect(account1).showUsdcBalance()));

        //owner create a bull position
        await exchange.betBullEth(toWei('1'), toWei('100'), ('1'));
        let roundNumber = await exchange.roundNumber();
        let round = await exchange.rounds(roundNumber);
        let bullMargin = round.bullMargin;
        let bullAmount = round.bullAmount;
        console.log('oldBullMargin:', toEther(bullMargin))
        console.log('oldBullAmount:', toEther(bullAmount))
        // assert.equal(toEther(bullAmount), '1.0');

        //account1 create a bear position
        await exchange.connect(account1).betBearEth(toWei('1'), toWei('100'), ('3'));
        round = await exchange.rounds(roundNumber);
        let bearMargin = round.bearMargin;
        let bearAmount = round.bearAmount;
        const isActive = round.isActive;
        console.log('oldBearMargin:', toEther(bearMargin))
        console.log('oldBearAmount:', toEther(bearAmount))
        assert.equal(isActive, true);
        
        //get start price with 100
        const latestRequestId = await exchange.latestRequestId();
        const value: number = 100;
        await mockOracle.fulfillOracleRequest(latestRequestId, numToBytes32(value));
        
        //increase price to 110
        await exchange.requestPrice();
        const newRequestId = await exchange.latestRequestId();
        const newValue: number = 130;
        await mockOracle.fulfillOracleRequest(newRequestId, numToBytes32(newValue));

        //test old and new price
        const lastId = await exchange.lastRequestId()
        const oldPrice = (await nftOracle.showPrice(lastId)).toNumber()
        assert.equal(oldPrice, 100);
        const latestId = await exchange.latestRequestId()
        const newPrice = (await nftOracle.showPrice(latestId)).toNumber()
        assert.equal(newPrice, 130);
        
        //calculate profit and loss
        await exchange.adjustCollateral();
        round = await exchange.rounds(roundNumber);
        bullMargin = round.bullMargin;
        bullAmount = round.bullAmount;
        ownerCollateral = await exchange.collateral(etherAddress, owner.address);
        console.log('newBullMargin:', toEther(bullMargin));
        console.log('newBullAmount:', toEther(bullAmount));
        bearMargin = round.bearMargin;
        bearAmount = round.bearAmount;
        Account1Collateral = await exchange.collateral(etherAddress, account1.address);
        console.log('newBearMargin:', toEther(bearMargin));
        console.log('newBearAmount:', toEther(bearAmount));
        */
      })
    })