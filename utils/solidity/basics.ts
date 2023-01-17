import { 
  GetCurrentSender,
  GetCurrentContract 
} from "../core";
import { GetContractOwner } from "./contract";

export function Owner() {
  return GetContractOwner(GetCurrentContract());
}

export const msg = {
  get sender() {
    return GetCurrentSender();
  }
}
