import { DeployFunction } from "hardhat-deploy/types"
import { network, ethers, run } from "hardhat"
import {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config"
import { autoFundCheck, verify } from "../helper-functions"

const deployFunction: DeployFunction = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log, get } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId: number | undefined = network.config.chainId
  if (!chainId) return

  let linkTokenAddress: string | undefined
  let oracle: string | undefined
  let nftOracle: string | undefined
  let additionalMessage: string = ``
  let ethUsdPriceFeedAddress:string | undefined
  // set log level to ignore non errors
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR)

  if (chainId === 31337) {
    let linkToken = await get(`LinkToken`)
    const EthUsdAggregator = await get("MockV3Aggregator")
    ethUsdPriceFeedAddress = EthUsdAggregator.address
    let MockOracle = await get(`MockOracle`)
    let NftOracle = await get(`NftOracle`)
    linkTokenAddress = linkToken.address
    oracle = MockOracle.address
    nftOracle = NftOracle.address
    additionalMessage = ` --linkaddress ${linkTokenAddress}`
  } else {
    linkTokenAddress = networkConfig[chainId].linkToken
    oracle = networkConfig[chainId].oracle
  }

  const jobId = ethers.utils.toUtf8Bytes(networkConfig[chainId].jobId!)
  // const jobId = process.env.NFT_JOBID_BYTES32
  const fee = networkConfig[chainId].fee
  const nftOracleAddress = process.env.NFT_ORACLE_ADDRESS

  const waitBlockConfirmations: number = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS
  const args = [nftOracle, jobId, '100000000000000000', process.env.NFT_ADDRESS, 'ETH', ethUsdPriceFeedAddress]
  const exchange = await deploy(`Exchange`, {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: waitBlockConfirmations,
  })

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...")
    await verify(exchange.address, args)
  }

  // Checking for funding...
//   if (
//     networkConfig[chainId].fundAmount &&
//     networkConfig[chainId].fundAmount.gt(ethers.constants.Zero)
//   ) {
//     log("Funding with LINK...")
//     if (
//       await autoFundCheck(exchange.address, network.name, linkTokenAddress!, additionalMessage)
//     ) {
//       await run("fund-link", {
//         contract: exchange.address,
//         linkaddress: linkTokenAddress,
//       })
//     } else {
//       log("Contract already has LINK!")
//     }
//   }

  log(`Run exchange contract with following command:`)
  const networkName: string = network.name == "hardhat" ? "localhost" : network.name
  log(`yarn hardhat request-data --contract ${exchange.address} --network ${networkName}`)
  log(`----------------------------------------------------`)
} 

export default deployFunction
deployFunction.tags = [`all`, `exchange`]
