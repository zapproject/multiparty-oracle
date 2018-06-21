pragma solidity ^0.4.24;

//import "./MPOInterface.sol";

import "./MPOStorage.sol";

//import "./~/Projects/ZapContracts/contracts/dispatch/DispatchInterface.sol";

contract MultiPartyOracle {

  MPOStorage stor;
  address public storageAddress;

  constructor(address _storageAddress, address[] _responders, uint256 _threshold) {
    stor = MPOStorage(_storageAddress);
    stor.setResponders(_responders);
    stor.setThreshold(_threshold);
  }

  function submitResponse1(uint256 queryId, string response) {
    require(stor.getAddressStatus(msg.sender) && !stor.queryFulfilled(queryId));
    stor.addResponse(queryId, response, msg.sender);
    if(stor.getTally(queryId, response) >= stor.getThreshold()) {
      //Dispatch.respond1(queryId, response);
    }
  }


}
