import { ethers } from "hardhat"
import fs from "fs"
import path from "path"

//extract exchange abi
const exchangeAbiFilePath = path.join(__dirname, '../artifacts/contracts/Exchange.sol/Exchange.json');
const exchangeAbiFile = JSON.parse(fs.readFileSync(exchangeAbiFilePath, 'utf-8'));
const exchangeAbi = exchangeAbiFile.abi;
//extract exchangeInfo abi
const exchangeInfoAbiFilePath = path.join(__dirname, '../artifacts/contracts/ExchangeInfo.sol/ExchangeInfo.json');
const exchangeInfoAbiFile = JSON.parse(fs.readFileSync(exchangeInfoAbiFilePath, 'utf-8'));
const exchangeInfoAbi = exchangeInfoAbiFile.abi;

async function setFundingRateForExchange({ exchangeAddress, exchangeInfoAddress }: { exchangeAddress: string, exchangeInfoAddress: string }) {
	const infuraUrl = 'https://goerli.infura.io/v3/e217b3b455054a03be57f930efd6708a'
	const provider = new ethers.providers.JsonRpcProvider(infuraUrl)
	const exchangeContract = new ethers.Contract(exchangeAddress, exchangeAbi, provider)
	const exchangeInfoContract = new ethers.Contract(exchangeInfoAddress, exchangeInfoAbi, provider)
    //test a call function
    const assetName = await exchangeContract.assetName()
    const isFundingRateUsed = await exchangeInfoContract.isFundingRateUsed(assetName);
    const lastFundingRateUpdateTime = await exchangeInfoContract.lastUpdateTime();
    const currentTimestampInSeconds = Math.floor(Date.now() / 1000);

    console.log("is funding rate used :", isFundingRateUsed)
    
    // return;
    console.log("lastupdateTime", Number(lastFundingRateUpdateTime))
    console.log("currentTimestamp", currentTimestampInSeconds)
    console.log("is Ok ?", currentTimestampInSeconds - Number(lastFundingRateUpdateTime) < 60*60)
    console.log("all Ok ?", !isFundingRateUsed && (currentTimestampInSeconds - Number(lastFundingRateUpdateTime) < 60*60))
    // return;
    if(!isFundingRateUsed && (currentTimestampInSeconds - Number(lastFundingRateUpdateTime) < 60*60) ){
	// Assuming setFundingRate is a transaction, you'd need a signer:
	const signer = new ethers.Wallet(process.env.PRIVATE_KEY_CHAINLINKM1 as string, provider);
	const tx = await exchangeContract.connect(signer).setFundingRate()
	const receipt = await tx.wait()
    if(receipt.status == 1){
        console.log("success")
        console.log("is funding rate used :", await exchangeInfoContract.isFundingRateUsed(assetName))
    }else{
        console.log("failed")
    }
    }
}

setFundingRateForExchange({exchangeAddress:"0xFFF09aF118Cc5746b35f4C23F3C3bd60d08ecab5", exchangeInfoAddress:"0x9868aC22a25b4634283965B55741B2D4ad8336A4"})