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
  let apiOralce: string | undefined
 
  let exchangeAddress : string | undefined
  // set log level to ignore non errors
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR)

  if (chainId === 31337) {
    const exchange = await get('Exchange');
    let linkToken = await get(`LinkToken`)
    let ApiOralce = await get(`MockApiOracle`)
    exchangeAddress = exchange.address;
    apiOralce = ApiOralce.address
    linkTokenAddress = linkToken.address
  } else {
    linkTokenAddress = networkConfig[chainId].linkToken
    oracle = networkConfig[chainId].oracle
  }

  const jobId = ethers.utils.toUtf8Bytes(networkConfig[chainId].jobId!)

  const waitBlockConfirmations: number = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS
  const args = [exchangeAddress, linkTokenAddress, apiOralce, jobId]
  const exchangeInfo = await deploy(`ExchangeInfo`, {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: waitBlockConfirmations,
  })

  

  
} 

export default deployFunction
deployFunction.tags = [`all`, `exchangeInfo`]
