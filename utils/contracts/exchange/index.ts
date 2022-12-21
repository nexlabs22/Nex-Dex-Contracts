import { 
  ATTR_NAME, 
  ATTR_TYPE, 
  CONTRACT_DEX, 
  TYPE_CONTRACT 
} from "../../constant";


export default function () {
  let Pool = Object.create(null);

  Pool[ATTR_TYPE] = TYPE_CONTRACT;
  Pool[ATTR_NAME] = CONTRACT_DEX;
  
}