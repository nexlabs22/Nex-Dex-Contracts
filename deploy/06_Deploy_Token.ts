import { DeployFunction } from "hardhat-deploy/types"
import { getNamedAccounts, deployments, network, ethers } from "hardhat";
import { fetchJson } from "ethers/lib/utils";

const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
const toEther = (e:any) => ethers.utils.formatEther(e);
const toWei = (e: string) => ethers.utils.parseEther(e);

const deployFunction: DeployFunction = async () => {
  
  

  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId: number | undefined = network.config.chainId

  // If we are on a local development network, we need to deploy mocks!
  if (chainId === 31337) {
    log(`Local network detected! Deploying Token...`)


    const token = await deploy(`Token`, {
      from: deployer,
      args: [toWei('1000000')],
      log: true,
      // waitConfirmations: waitBlockConfirmations,
    })

    log(`Token Deployed!`)
    log(`----------------------------------------------------`)
    log(`You are deploying to a local network, you'll need a local network running to interact`)
    log("Please run `yarn hardhat console` to interact with the deployed smart contracts!")
    log(`----------------------------------------------------`)
  }
}

export default deployFunction
deployFunction.tags = [`all`, `token`]
