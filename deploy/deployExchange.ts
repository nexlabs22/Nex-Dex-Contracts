import { ethers, network } from "hardhat"
require("dotenv").config()
import "@nomiclabs/hardhat-ethers"
const hre = require("hardhat")

async function main() {
  //goerli nftOracle = 0x5630D8903B9702E26e08879A8D5886815e1Ea07E

  const Exchange = await ethers.getContractFactory("Exchange")
  const exchange = await Exchange.deploy(
    "0x5630D8903B9702E26e08879A8D5886815e1Ea07E",
    process.env.NFT_JOBID_BYTES32 as string,
    "100000000000000000",
    process.env.NFT_ADDRESS as string,
    "ETH",
    "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e", // eth/usd price feed
    process.env.GOERLI_USDT as string
  )

  console.log(`Staking contract deployed by address ${exchange.address}`)

  if (network.name == "hardhat" || network.name == "localhost") return
  await exchange.deployTransaction.wait(21)
  console.log("Verifing...")
  await hre.run("verify:verify", {
    address: exchange.address,
    constructorArguments: [
      "0x5630D8903B9702E26e08879A8D5886815e1Ea07E",
      process.env.NFT_JOBID_BYTES32 as string,
      "100000000000000000",
      process.env.NFT_ADDRESS as string,
      "ETH",
      "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e", // eth/usd price feed
      process.env.GOERLI_USDT as string,
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
