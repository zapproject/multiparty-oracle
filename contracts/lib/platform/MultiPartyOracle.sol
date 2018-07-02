pragma solidity ^0.4.24;

import "./MPOStorage.sol";
import "./OnChainProvider.sol";
import "./Client.sol";

import "../ERC20.sol";
import "../lifecycle/Destructible.sol";

import "../../platform/bondage/BondageInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "../../platform/dispatch/DispatchInterface.sol";

contract MultiPartyOracle is OnChainProvider, Client1 {
    event RecievedQuery(string query, bytes32 endpoint, bytes32[] params, address sender);
    event ReceivedResponse(uint256 queryId, address responder, string response);

    event Result1(uint256 id, string response1);

    DispatchInterface dispatch;
    RegistryInterface registry;
    MPOStorage stor;
    
    //move dispatch address to storage
    address dispatchAddress;
    address public storageAddress;

    bytes32 public spec1 = "Hello?";
    bytes32 public spec2 = "Reverse";

    // curve 2x^2
    int[] constants = [2, 2, 0];
    uint[] parts = [0, 1000000000];
    uint[] dividers = [1]; 

    constructor(address registryAddress, address _dispatchAddress, address mpoStorageAddress) public{

        registry = RegistryInterface(registryAddress);
        dispatch = DispatchInterface(_dispatchAddress);
        stor = MPOStorage(mpoStorageAddress);
        dispatchAddress = _dispatchAddress;

        

        // initialize in registry
        bytes32 title = "MultiPartyOracle";

        bytes32[] memory params = new bytes32[](2);
        params[0] = "p1";

        registry.initiateProvider(12345, title, spec1, params);
        registry.initiateProviderCurve(spec1, constants, parts, dividers);
        registry.initiateProviderCurve(spec2, constants, parts, dividers);

    }

    // middleware function for handling queries
    function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams, bool onchainSubscriber) external {
        emit RecievedQuery(userQuery, endpoint, endpointParams, msg.sender);
        require(msg.sender == dispatchAddress && stor.getQueryStatus(id) == 0 );
        stor.setQueryStatus(id,1);
    // stor.setClientQueryId(id, dispatch.query(stor.getResponderAddress(0), 
    //                                                     userQuery, 
    //                                                     endpoint, 
    //                                                     endpointParams, 
    //                                                     true, 
    //                                                     true));
        for(uint i=2; i>0; i--) {      
          stor.setClientQueryId(id, dispatch.query(stor.getResponderAddress(i), 
                                                    userQuery, 
                                                    endpoint, 
                                                    endpointParams, 
                                                    true, 
                                                    true));
        }
        // bytes32 hash = keccak256(endpoint);
        // if(hash == keccak256(spec1)) {
        //     stor.setQueryStatus(id,1);
        //     endpoint1(id, userQuery, endpointParams);
        // }
        // else if(hash == keccak256(spec2)) {
        //     stor.setQueryStatus(id,1);
        //     endpoint2(id, userQuery, endpointParams);
        // }
    }

    function setParams(address[] _responders, address _client, uint256 _threshold) public {
        require(_threshold>0 && _threshold <= _responders.length);    
        stor.setThreshold(_threshold);
        stor.setResponders(_responders);
        //stor.setClient(_client);
    }

    // queries mulitple onchain providers
    function endpoint1(uint256 id, string userQuery, bytes32[] endpointParams) internal{
        for(uint i=0; i<stor.getNumResponders(); i++) {      
          stor.setClientQueryId(id, dispatch.query(stor.getResponderAddress(i), userQuery, spec1, endpointParams, true, true));
        }
    }

    function endpoint2(uint256 id, string userQuery, bytes32[] endpointParams) internal{
        for(uint i=0; i<stor.getNumResponders(); i++) {      
          stor.setClientQueryId(id, dispatch.query(stor.getResponderAddress(i), userQuery, spec2, endpointParams, true, true));
        }
    }

    function callback(uint256 MPOId, string response) external {
        require(msg.sender == dispatchAddress);
        //stor.getClientQueryId(MPOId);5
        stor.addResponse(stor.getClientQueryId(MPOId), response);
        emit ReceivedResponse(stor.getClientQueryId(MPOId), msg.sender, response);
    
        if(stor.getTally(stor.getClientQueryId(MPOId), response) >= stor.getThreshold() && stor.getQueryStatus(stor.getClientQueryId(MPOId)) == 1) {
            stor.setQueryStatus(stor.getClientQueryId(MPOId), 2);
            emit Result1(stor.getClientQueryId(MPOId), response);
            dispatch.respond1(stor.getClientQueryId(MPOId), response);
        }
    }

}