import { ethers, network } from "hardhat"
require("dotenv").config()
import "@nomiclabs/hardhat-ethers"
const hre = require("hardhat")

async function main() {
  //goerli tokenPay contract = 0xe3098345f4fcb358C902eAAEB9AbD4c14CF741D8
  const TokenPay = await ethers.getContractFactory("TokenPay")
  const tokenPay = await TokenPay.deploy()

  console.log(`TokenPay contract deployed by address ${tokenPay.address}`)

  if (network.name == "hardhat" || network.name == "localhost") return
  await tokenPay.deployTransaction.wait(21)
  console.log("Verifing...")
  await hre.run("verify:verify", {
    address: tokenPay.address,
    constructorArguments: [],
  })
  console.log("Contract verified successfully !")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
