import { IsContract, GetContractAddress } from "../solidity/contract"
import { ContractFunctionCalled, ContractFunctionEnded, ContractSenderChanged } from "./worker"

export default function (object: any) {
  if (IsContract(object)) {
    const objectProxy = new Proxy(object, {
      get: function (target, prop, receiver) {
        // To add connect feature to contracts
        // await exchange.connect(account1).deposit...
        if (prop === "connect") {
          return function () {
            const [account] = arguments
            ContractSenderChanged({
              address: GetContractAddress(target),
              sender: account?.address,
            })
            return objectProxy
          }
        }

        if (!(target && prop && typeof prop === "string" && typeof target[prop] === "function"))
          return Reflect.get(target, prop, receiver)

        return function () {
          ContractFunctionCalled({
            address: GetContractAddress(target),
            funcName: prop,
          })
          const result = target[prop].call(objectProxy, ...arguments)
          ContractFunctionEnded({
            address: GetContractAddress(target),
            funcName: prop,
          })
          return result
        }
      },
    })

    return objectProxy
  }
}
