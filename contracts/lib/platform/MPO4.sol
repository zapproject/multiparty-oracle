pragma solidity ^0.4.24;

import "./MPOStorage.sol";
import "./MultiPartyOracle.sol";
import "./OnChainProvider.sol";
import "./Client.sol";

import "../ERC20.sol";
import "../lifecycle/Destructible.sol";

import "../../platform/bondage/BondageInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "../../platform/dispatch/DispatchInterface.sol";

contract MPO4 is OnChainProvider, Client4{
    event RecievedQuery(string query, bytes32 endpoint, bytes32[] params, address sender);
    event ReceivedResponse(uint256 queryId, address responder, string response);
    event Incoming(
        uint256 id,
        address provider,
        address subscriber,
        string query,
        bytes32 endpoint,
        bytes32[] endpointParams,
        bool onchainSubscriber
    );

    event Result4(uint256 id, string response1, string response2, string response3, string response4);

    DispatchInterface dispatch;
    RegistryInterface registry;
    MPOStorage stor;
    
    //move dispatch address to storage
    address dispatchAddress;
    address public storageAddress;

    bytes32 public spec1 = "Offchain";
    bytes32 public spec2 = "Onchain";
    bytes32 public spec3 = "Nonproviders";

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
        registry.initiateProviderCurve(spec3, constants, parts, dividers);

    }

    // middleware function for handling queries
    function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams, bool onchainSubscriber) external {
        emit RecievedQuery(userQuery, endpoint, endpointParams, msg.sender);
        require(stor.getThreshold() > 0 && stor.getThreshold() <= stor.getNumResponders());    
        require(msg.sender == dispatchAddress && stor.getQueryStatus(id) == 0 );

        // For Offchain providers
        bytes32 hash = keccak256(endpoint);
        if(hash == keccak256(spec1)) {
            stor.setQueryStatus(id,1);
            endpoint1(id, userQuery, endpointParams);
        }
        else if(hash == keccak256(spec2)) {
            stor.setQueryStatus(id,2);
            stor.setClientQueryId(id);
            endpoint2(id, userQuery, endpointParams);
        }
        else if(hash == keccak256(spec3)) {
            stor.setQueryStatus(id,1);
            stor.setClientQueryId(id);
            endpoint3(id, userQuery, endpointParams);
        }
    }

    function setParams(address[] _responders, uint256 _threshold) public {
        require(_threshold>0 && _threshold <= _responders.length);    
        stor.setThreshold(_threshold);
        stor.setResponders(_responders);
    }

    //query offchain providers
    function endpoint1(uint256 id, string userQuery, bytes32[] endpointParams) internal{
       //set query status to 1
        uint i;
        if(keccak256(userQuery) == keccak256("Hello?")) {
            for(i=0; i<stor.getNumResponders(); i++) {      
                stor.setClientQueryId(dispatch.query(stor.getResponderAddress(i), userQuery, "Hello?", endpointParams, false, true),
                                id);
            }
        } else if(keccak256(userQuery) == keccak256("Reverse")) {
            for(i=0; i<stor.getNumResponders(); i++) {      
                stor.setClientQueryId(dispatch.query(stor.getResponderAddress(i), userQuery, "Reverse", endpointParams, false, true),
                                id);
            }
        }
    }

    //query onchain providers
    function endpoint2(uint256 id, string userQuery, bytes32[] endpointParams) internal{
        //set queryStatus to 2
        uint i;
        if(keccak256(userQuery) == keccak256("Hello?")) {
            for(i=0; i<stor.getNumResponders(); i++) {      
                dispatch.query(stor.getResponderAddress(i), userQuery, "Hello?", endpointParams, true, true);
            }
        } else if(keccak256(userQuery) == keccak256("Reverse")) {
            for(i=0; i<stor.getNumResponders(); i++) {      
                dispatch.query(stor.getResponderAddress(i), userQuery, "Reverse", endpointParams, true, true);
            }
        }
    }

    //query nonproviders
    function endpoint3(uint256 id, string userQuery, bytes32[] endpointParams) internal{
        uint256 mpoid;
        for(uint i=0; i<stor.getNumResponders(); i++) {      
            mpoid=uint256(keccak256(
                block.number, now, userQuery,id,stor.getResponderAddress(i)
                ));
            stor.setClientQueryId(mpoid, id);
            emit Incoming(mpoid, stor.getResponderAddress(i),this, userQuery, "Hello?", endpointParams, true);
                
        }
    }


    function callback(uint256 queryId, string response, string response2, string response3, string response4) external {
        require(msg.sender == dispatchAddress||
        (stor.getAddressStatus(msg.sender) &&
        !stor.onlyOneResponse(stor.getClientQueryId(queryId),msg.sender)));
        
        if(stor.getQueryStatus(stor.getClientQueryId(queryId)) == 1){
            stor.addResponse(stor.getClientQueryId(queryId), response, msg.sender);
            emit ReceivedResponse(stor.getClientQueryId(queryId), msg.sender, response);
            if(stor.getTally(stor.getClientQueryId(queryId), response) >= stor.getThreshold()) {
                stor.setQueryStatus(stor.getClientQueryId(queryId), 3);
                emit Result4(stor.getClientQueryId(queryId), response, response2,response3, response4);
                dispatch.respond4(stor.getClientQueryId(queryId), response, response2,response3, response4);
            }
        }
        else if(stor.getQueryStatus(stor.getClientQueryId()) == 2){
            stor.addResponse(stor.getClientQueryId(), response, msg.sender);
            emit ReceivedResponse(stor.getClientQueryId(), msg.sender, response);
            if(stor.getTally(stor.getClientQueryId(), response) >= stor.getThreshold()) {
                stor.setQueryStatus(stor.getClientQueryId(), 3);
                emit Result4(stor.getClientQueryId(), response, response2, response3, response4);
                dispatch.respond4(stor.getClientQueryId(), response, response2, response3, response4);
            }

        }

    }

}