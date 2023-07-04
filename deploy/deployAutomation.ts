import { ethers, network } from "hardhat"
require("dotenv").config()
import "@nomiclabs/hardhat-ethers"
import { networks } from "../network";
const hre = require("hardhat")

async function main() {
  //goerli nftOracle = 0x5630D8903B9702E26e08879A8D5886815e1Ea07E
  //goerli nftOracleFeed = 0xB677bfBc9B09a3469695f40477d05bc9BcB15F50
  //goerli eth/usd price feed = 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e

  //gold exchange info = 0x91C6623357C1C6E94674feBCD26e6e21FB6Eb382
  //silver exchange info = 0x5Cd93F5C4ECE56b7faC31ABb3c1933f6a6FE7182
  
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;

  const Automation = await ethers.getContractFactory("ExchangePriceListener")
  const automation = await Automation.deploy(
    networks[chainId].assetExchangeAddress,
    networks[chainId].assetExchangeInfoAddress
  )

  console.log(`Automation contract deployed by address ${automation.address}`)

  return;
  if (network.name == "hardhat" || network.name == "localhost") return
  await automation.deployTransaction.wait(21)
  console.log("Verifing...")
  await hre.run("verify:verify", {
    address: automation.address,
    constructorArguments: [
      "0xB677bfBc9B09a3469695f40477d05bc9BcB15F50",//nftOracleFeed
      "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e", // eth/usd price feed
      process.env.GOERLI_USDT as string
    ],
  })
  console.log("Contract verified successfully !")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
