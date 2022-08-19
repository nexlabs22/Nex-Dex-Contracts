import { numToBytes32, stringToBytes } from "@chainlink/test-helpers/dist/src/helpers"
import { assert, expect } from "chai"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { network, deployments, ethers, run } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { APIConsumer, LinkToken, MockOracle } from "../../typechain"

const chainId = 31337;
const jobId = ethers.utils.toUtf8Bytes(networkConfig[chainId].jobId!);

!developmentChains.includes(network.name)
? describe.skip
: describe("NftOracle Unit Tests", async function () {
      let nftOracle:any
      let linkToken: LinkToken
      let mockOracle: MockOracle


      beforeEach(async () => {
        await deployments.fixture(["mocks", "nftOracle"]);
        linkToken = await ethers.getContract("LinkToken")
        const linkTokenAddress: string = linkToken.address
        nftOracle = await ethers.getContract("NftOracle")
        mockOracle = await ethers.getContract("MockOracle")
        await run("fund-link", { contract: nftOracle.address, linkaddress: linkTokenAddress })
      })

      it("Should successfully make an price request and get a result", async () => {
        
        const transaction = await nftOracle.getFloorPrice(
            jobId,
            '100000000000000000',
            process.env.NFT_ADDRESS,
            'ETH'
        )
        const transactionReceipt = await transaction.wait(1)
        if (!transactionReceipt.events) return
        const requestId: string = transactionReceipt.events[0].topics[1]
        const callbackValue = 135;
        await mockOracle.fulfillOracleRequest(requestId, numToBytes32(callbackValue))
        const price = await nftOracle.showPrice(requestId)
        assert.equal(price.toNumber(), callbackValue);
      })

    })
