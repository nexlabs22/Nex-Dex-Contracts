
const Web3 = require("web3") // for nodejs only
// Replace the provider URL with your own endpoint URL
const web3 = new Web3(process.env.ETH_ANKR_RPC)
const aggregatorV3InterfaceABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "description",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint80", name: "_roundId", type: "uint80" }],
    name: "getRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
]


const addr = "0x352f2Bc3039429fC2fe62004a1575aE74001CfcE" //ETH bayc oracle address
const priceFeed = new web3.eth.Contract(aggregatorV3InterfaceABI, addr) //oracle price feed contract

let priceHistory = [];

  async function readPrice() {
    const historicalRoundData =  await priceFeed.methods.latestRoundData().call();
    const num = BigInt(historicalRoundData.roundId)
    const num2 = BigInt("0xFFFFFFFFFFFFFFFF") // Largest 64bits integer
    console.log(Number(num >> BigInt(64))) // returns 5 (phaseId)
    console.log(Number(num & num2)) // returns 13078 (aggregatorRoundId) . Use & (AND bitwise operator) which sets each bit to _1_ if both bits are _1_
    const firstRoundId = BigInt(historicalRoundData.roundId) - BigInt(num & num2) + BigInt(1);
    
    //get price for each round
    for(let i = firstRoundId; i < BigInt(historicalRoundData.roundId); i ++) {
        console.log(i);
        const roundData = await priceFeed.methods.getRoundData((i)).call()
        console.log("Price", roundData.answer)
        const date = new Date(Number(roundData.updatedAt)* 1000);
        console.log("Date", (date));

        priceHistory.push({
            price: roundData.answer,
            date: date
        });
    }
}

readPrice();

