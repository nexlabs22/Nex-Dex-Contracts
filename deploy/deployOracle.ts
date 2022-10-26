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

  
  console.log(`Staking contract deployed by address ${nftOracle.address}`)

  if (network.name == "hardhat" || network.name == "localhost") return
  await nftOracle.deployTransaction.wait(21)
  console.log("Verifing...")
  await hre.run("verify:verify", {
    address: nftOracle.address,
    constructorArguments: [
        process.env.LINK_GOERLI_ADDRESS as string,
        process.env.NFT_ORACLE_ADDRESS as string
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
