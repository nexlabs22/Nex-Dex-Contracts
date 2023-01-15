import { isContract, getContractName } from "../solidity/contract"
import { ContractFunctionCalled, ContractFunctionEnded } from "./worker"

export default function (object) {
  if (isContract(object)) {
    const objectProxy = new Proxy(object, {
      get: function (target, prop, receiver) {
        if (!(target && prop && typeof target[prop] === "function"))
          return Reflect.get(target, prop, receiver)

        return function () {
          ContractFunctionCalled({
            contract: getContractName(target),
            funcName: prop,
          })
          const result = target[prop].call(objectProxy, ...arguments)
          ContractFunctionEnded({
            contract: getContractName(target),
            funcName: prop
          })
          return result;
        }
      },
    })

    return objectProxy
  }
}
