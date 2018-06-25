pragma solidity ^0.4.24;

import "./MPOStorage.sol";
import "./OnChainProvider.sol";
import "./Client.sol";

contract MultiPartyOracle is OnChainProvider, Client1 {

  event ReceivedQuery(string query, bytes32 endpoint, bytes32[] params);

  event ReceivedResponse(uint256 queryId, address responder, string response);

  MPOStorage stor;
  address public storageAddress;

  constructor(address _storageAddress) public {
    stor = MPOStorage(_storageAddress);
  }

  function setParams(address[] _responders, address _client, uint256 _threshold) public {
    require(_threshold>0 && _threshold <= _responders.length);    
    stor.setThreshold(_threshold);
    stor.setResponders(_responders);
    stor.setClient(_client);
  }

  function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams) external {
    //TODO: queryId will eventually be given by dispatch
    require(msg.sender==stor.getClient());
    //MAYBE: Break for loop if it becomes impossible to fulfill threshold?
    //example: if threshold of 3 has not been fulfilled after 2/3 parties respond, revert
    emit ReceivedQuery(userQuery, endpoint, endpointParams);
    require(stor.getQueryStatus(id)==0);
    stor.setQueryStatus(id,1);
    // query each of the responders
    for(uint i=0; i<stor.getNumResponders(); i++){      
      OnChainProvider(stor.getResponderAddress(i)).receive(id, userQuery, endpoint, endpointParams);
      
    }

  }

  function callback(uint256 queryId, string response) external {
      require(stor.getAddressStatus(msg.sender) && 
            !stor.onlyOneResponse(queryId, msg.sender)&&
            stor.getQueryStatus(queryId) == 1);

      stor.addResponse(queryId, response, msg.sender);
      emit ReceivedResponse(queryId, msg.sender, response);
    

    if(stor.getTally(queryId, response) >= stor.getThreshold()) {
      stor.setQueryStatus(queryId, 2);
      Client1(stor.getClient()).callback(queryId, response);
    }
  }
}
