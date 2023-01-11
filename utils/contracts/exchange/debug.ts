import { toNumber } from "../../basics"

export default function (contract: any): any {
  contract.__printCurrentStatus = function () {
    // const result = [];
    // for (let i = 0; i < this.userAccounts.length; i++) {
    //   // if (this.activeUsers[i] === address(0)) break;
    //   const status = this.getUserStatus(this.userAccounts[i].address, this.poolState);
    //   result.push({
    //     Id: "User" + i,
    //     Collateral: toNumber(status.collateral),
    //     AccountValue: toNumber(status.accountValue),
    //     NotionalValue: toNumber(status.notionalValue),
    //     PNL: toNumber(status.pnl),
    //     Margin: toNumber(status.margin),
    //     VirtuaUsdBalance: toNumber(status.vUsdBalance),
    //     VirtuaBaycBalance: toNumber(status.vBaycBalance),
    //   });
    // }

    // result.push({});

    // result.push({
    //   Collateral: 'Virtual Collateral',
    //   AccountValue: 'Insurance Fund',
    //   NotionalValue: 'Contract Collateral',
    //   PNL: 'Total Fee',
    //   Margin: 'Price',
    // })

    // result.push({
    //   Id: 'Contract',
    //   Collateral: toNumber(this.virtualCollateral),
    //   AccountValue: toNumber(this.insuranceFunds),
    //   NotionalValue: toNumber(this.realCollateral),
    //   PNL: toNumber(this.feeCollector),
    //   Margin: toNumber(this.price),
    // })

    // console.table(result);

    console.log(toNumber(contract?.pool?.vBaycPoolSize), toNumber(contract?.pool?.vUsdPoolSize));
    console.log(toNumber(contract?.showPriceUSD()));
  }

  return contract;
}
