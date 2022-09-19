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

      it("Should successfully deposit collateral", async () => {
        const [owner, account1, account2] = await ethers.getSigners();
        
        //owner deposit collateral
        await exchange.depositEther({value: toWei('10')});
        const etherAddress = exchange.ETHER()
        let ownerCollateral = await exchange.collateral(etherAddress, owner.address);
        assert.equal(toEther(ownerCollateral), '10.0');
      })

      it("Should successfully withdraw collateral", async () => {
        const [owner, account1, account2] = await ethers.getSigners();
        
        //owner deposit collateral
        await exchange.depositEther({value: toWei('10')});
        const etherAddress = exchange.ETHER()
        let ownerCollateral = await exchange.collateral(etherAddress, owner.address);
        assert.equal(toEther(ownerCollateral), '10.0');
        
        await exchange.withdrawEther(toWei('10'));
        ownerCollateral = await exchange.collateral(etherAddress, owner.address);
        assert.equal(toEther(ownerCollateral), '0.0');
      })

      it("Should successfully put the order", async () => {
        const [owner, account1, account2] = await ethers.getSigners();
        
        //owner deposit collateral
        await exchange.depositEther({value: toWei('10')});
        await exchange.connect(account1).depositEther({value: toWei('10')});
        await exchange.connect(account2).depositEther({value: toWei('10')});
        const etherAddress = exchange.ETHER();
        let ownerCollateral = await exchange.collateral(etherAddress, owner.address);
        assert.equal(toEther(ownerCollateral), '10.0');
        
        // console.log(toEther(await exchange.collateralUsdValue(owner.address)));
        await exchange.openLongOrder(owner.address, toWei('0.1'), toWei('1000'));
        await exchange.connect(account2).openLongOrder(owner.address, toWei('0.1'), toWei('1000'));
        let longOrders = await exchange.allLongOrders();
        let shortOrders = await exchange.allShortOrders();
        let positions = await exchange.allPositions();
        console.log('l1',longOrders.length)
        console.log('s1',shortOrders.length)
        console.log('p1',positions.length)
        await exchange.connect(account1).openShortOrder(account1.address, toWei('0.1'), toWei('1000'));
        longOrders = await exchange.allLongOrders();
        shortOrders = await exchange.allShortOrders();
        positions = await exchange.allPositions();
        console.log('l2',longOrders.length)
        console.log('s2',shortOrders.length)
        console.log('p2',positions.length)
      })
    })
