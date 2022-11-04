import { DeployFunction } from "hardhat-deploy/types"
import { getNamedAccounts, deployments, network, ethers } from "hardhat";
import { fetchJson } from "ethers/lib/utils";

const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
const toEther = (e:any) => ethers.utils.formatEther(e);
const toWei = (e: string) => ethers.utils.parseEther(e);

const deployFunction: DeployFunction = async () => {
  
  const DECIMALS: string = `18`
  let INITIAL_PRICE: any = `200000000000000000000`
  let response:any = await fetchJson(url);
  // INITIAL_PRICE = toWei(response.ethereum.usd.toString());
  INITIAL_PRICE = (response.ethereum.usd.toFixed(0)*10**8).toString();
  /**
   * @dev Read more at https://docs.chain.link/docs/chainlink-vrf/
   */
  const BASE_FEE = "100000000000000000"
  const GAS_PRICE_LINK = "1000000000" // 0.000000001 LINK per gas

  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId: number | undefined = network.config.chainId

  // If we are on a local development network, we need to deploy mocks!
  if (chainId === 31337) {
    log(`Local network detected! Deploying mocks...`)

    const linkToken = await deploy(`LinkToken`, { from: deployer, log: true })

    await deploy(`MockV3Aggregator`, {
      contract: `MockV3Aggregator`,
      from: deployer,
      log: true,
      args: [DECIMALS, INITIAL_PRICE],
    })

    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK],
    })

    await deploy(`MockV3AggregatorNft`, {
      contract: `MockV3Aggregator`,
      from: deployer,
      log: true,
      args: [DECIMALS, INITIAL_PRICE],
    })

    
    await deploy(`MockOracle`, {
      from: deployer,
      log: true,
      args: [linkToken.address],
    })
    
    log(`Mocks Deployed!`)
    log(`----------------------------------------------------`)
    log(`You are deploying to a local network, you'll need a local network running to interact`)
    log("Please run `yarn hardhat console` to interact with the deployed smart contracts!")
    log(`----------------------------------------------------`)
  }
}

export default deployFunction
deployFunction.tags = [`all`, `mocks`, `main`]
