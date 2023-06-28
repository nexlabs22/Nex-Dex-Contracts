import { ethers, network } from "hardhat"
require("dotenv").config()
import "@nomiclabs/hardhat-ethers"
const hre = require("hardhat")

/**
 verify command
 npx hardhat verify --contract contracts/Index-contracts/IndexName.sol:IndexName –network goerli <deployedContractAddress> <oracleAddress> <ethusd oracle address> <goerli usdt address>

 */

async function main() {
  //goerli nftOracle = 0x5630D8903B9702E26e08879A8D5886815e1Ea07E
  //goerli nftOracleFeed = 0xB677bfBc9B09a3469695f40477d05bc9BcB15F50
  //goerli eth/usd price feed = 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e

  const Exchange = await ethers.getContractFactory("Exchange")
  const exchange = await Exchange.deploy(
    // "0xB677bfBc9B09a3469695f40477d05bc9BcB15F50",//nftOracleFeed
    // "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e", // eth/usd price feed
    process.env.GOERLI_USDT as string
  )

  console.log(`Exchange contract deployed by address ${exchange.address}`)
  return;
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




// npx hardhat verify --contract contracts/Exchange.sol:Exchange 0xf4338c04b412434943e9301dD357C2Ed54e775Cf 0xB677bfBc9B09a3469695f40477d05bc9BcB15F50 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e 0x636b346942ee09Ee6383C22290e89742b55797c5 --network goerli