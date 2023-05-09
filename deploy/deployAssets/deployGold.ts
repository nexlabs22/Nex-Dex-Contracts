import { ethers, network } from "hardhat"
require("dotenv").config()
import "@nomiclabs/hardhat-ethers"
const hre = require("hardhat")

async function main() {
  //goerli nftOracle = 0x5630D8903B9702E26e08879A8D5886815e1Ea07E
  //goerli nftOracleFeed = 0xB677bfBc9B09a3469695f40477d05bc9BcB15F50
  //goerli eth/usd price feed = 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e
  // goerli gold contract = 0x6B1383F637d4Ad470c3F27d320340c9189fE8f47
  // goerli silver contract = 0x9b6F6D0994De28DF13d820F7fAA29a2d29224DcB
  //npx hardhat verify --contract contracts/Index-contracts/Silver.sol:Silver --network goerli 0x90Edb005e95ffA0D8b0c8D26CDCd7fE499A1408c 0xB677bfBc9B09a3469695f40477d05bc9BcB15F50 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e 0x636b346942ee09Ee6383C22290e89742b55797c5
  
  const Exchange = await ethers.getContractFactory("Gold")
  const exchange = await Exchange.deploy(
    "0xB677bfBc9B09a3469695f40477d05bc9BcB15F50",//nftOracleFeed
    "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e", // eth/usd price feed
    process.env.GOERLI_USDT as string
  )

  console.log(`Exchange contract deployed by address ${exchange.address}`)

  if (network.name == "hardhat" || network.name == "localhost") return
  await exchange.deployTransaction.wait(21)
  console.log("Verifing...")
  await hre.run("verify:verify", {
    address: exchange.address,
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
