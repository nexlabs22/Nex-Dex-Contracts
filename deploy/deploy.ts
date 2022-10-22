import { ethers, network } from "hardhat"
require("dotenv").config()
import "@nomiclabs/hardhat-ethers"
const hre = require("hardhat")

async function main() {
  const NftOracle = await ethers.getContractFactory("NftOracle")
  const nftOracle = await NftOracle.deploy(
    process.env.LINK_GOERLI_ADDRESS as string,
    process.env.NFT_ORACLE_ADDRESS as string
  )

  //goerli nftOracle = 0x20641Df7EFDe0CCC0fc4c9F26E89c07A616e5DAe

  const Exchange = await ethers.getContractFactory("Exchange")
  const exchange = await Exchange.deploy(
    "0x20641Df7EFDe0CCC0fc4c9F26E89c07A616e5DAe",
    process.env.NFT_JOBID_BYTES32 as string,
    "100000000000000000",
    process.env.NFT_ADDRESS as string,
    "USD",
    "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e", // eth/usd price feed
     process.env.GOERLI_USDT as string
  )

  console.log(`Staking contract deployed by address ${nftOracle.address}`)

  if (network.name == "hardhat" || network.name == "localhost") return
  await exchange.deployTransaction.wait(6)
  console.log("Verifing...")
  await hre.run("verify:verify", {
    address: exchange.address,
    constructorArguments: [
      "0x20641Df7EFDe0CCC0fc4c9F26E89c07A616e5DAe",
      process.env.NFT_JOBID_BYTES32 as string,
      "100000000000000000",
      process.env.NFT_ADDRESS as string,
      "USD",
      "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
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
