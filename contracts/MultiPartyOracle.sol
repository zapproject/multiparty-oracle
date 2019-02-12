pragma solidity ^0.4.24;

import "./MPOStorage.sol";
import "./lib/Destructible.sol";
import "./lib/ZapInterface.sol";

// @title - A MultiPartyOracle contract that implements the client1 callback
// @authors - Max Inciong, Jonathan Pang, Jon Morales
// @notice the contract receives queries from dispatch and queries multiple providers to resolve the query

contract MultiPartyOracle {
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

    event Result1(uint256 id, string response1);

    ZapInterface dispatch;
    ZapInterface registry;
    MPOStorage stor;
    
    //move dispatch address to storage
    address dispatchAddress;
    address registryAddress;
    address public storageAddress;

    address[] parties;
    mapping(address => bool) approvedAddress; 

    bytes32 public spec3 = "Nonproviders";
    int256[] curve3 = [1,1,1000000000];
    // curve 2x^2
    // @notice constructor that sets up zap registry, dispatch, and MPO storage. Also sets up registry provider curve
    // @param address registryAddress
    // @param address _dispatchAddress
    // @param address mpoStorageAddress
    
    constructor(address _zapCoord, address mpoStorageAddress, address[] _responders) public{
        // require(_responders.length<=stor.getNumResponders(), "Soft Cap reached");
        registryAddress = ZapInterface(_zapCoord).getContract("REGISTRY");
        registry = ZapInterface(registryAddress);
        dispatchAddress = ZapInterface(_zapCoord).getContract("DISPATCH");
        dispatch = ZapInterface(dispatchAddress);
        stor = MPOStorage(mpoStorageAddress);
        // parties = _responders;
        // stor.setResponders(_responders);
        // initialize in registry
        bytes32 title = "MultiPartyOracle";
        registry.initiateProvider(12345, title);
        registry.initiateProviderCurve(spec3, curve3, address(0));

    }
    function setup(address[] _responders) public{
        stor.setResponders(_responders);
    }
    function bytesToUint(bytes32 b) public returns (uint256){
        uint256 number;
        for(uint i=0;i<b.length;i++){
            number = number + uint(b[i])*(2**(8*(b.length-(i+1))));
        }
        return number;
    }
    // middleware function for handling queries
    // @notice recieves query, called from dispatch
    // @param uint256 id Dispatch created query ID
    // @param string userQuery User provided query String
    // @param bytes32 endpoint Determines whether to use Onchain Providers, Offchain Providers, Non-Providers
    // @param bytes32[] endpointParams Parameters passed to providers
    // @param bool onchainSubscriber Unused boolean that determines if subscriber is a smart contract
    function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams, bool onchainSubscriber) external {
        emit RecievedQuery(userQuery, endpoint, endpointParams, msg.sender);
        require(msg.sender == dispatchAddress && stor.getQueryStatus(id) == 0, "Dispatch only");
        // endpoint params [from, to, threshold, precision, delta]
        bytes32 hash = keccak256(abi.encodePacked(endpoint));
        uint256 threshold = bytesToUint(endpointParams[2]);
        emit Result1(threshold,"test");
        // require(threshold>0 && threshold <= parties.length,"Invalid Threshold Length");
        stor.setThreshold(id, bytesToUint(endpointParams[2]) );
        stor.setPrecision(id, bytesToUint(endpointParams[3]) );
        stor.setDelta(id, uint256(endpointParams[4]) );
        if(hash == keccak256(abi.encodePacked(spec3))) {
            stor.setQueryStatus(id,1);
            
            
            uint256 mpoid;

            for(uint i=0; i<stor.getNumResponders(); i++) {      
                mpoid=uint256(keccak256(abi.encodePacked(
                                block.number, now, userQuery,id,stor.getResponderAddress(i)
                                )));
                stor.setClientQueryId(mpoid, id);
                emit Incoming(mpoid, stor.getResponderAddress(i),this, userQuery, "Hello?", endpointParams, true);
                
            }
        }
    }
    

    // @notice callback used by dispatch or nonproviders once a response has been created for the query
    // @param queryId MPO or dispatch generated MPOID to used to determine client query ID
    // @param response Response to be returned to client
    // @dev query status is 1 if receiving from offchain, 2 if from onchain.
    function callback(uint256 queryId, int[] responses) external {
        require(
            stor.getAddressStatus(msg.sender) &&
            !stor.onlyOneResponse(stor.getClientQueryId(queryId),msg.sender),
            "Invalid Sender/Response sent twice");

        int response = responses[0];
        emit Result1(uint256(response),"responsecallback");
        if(stor.getQueryStatus(stor.getClientQueryId(queryId)) == 1){
            intResponse(stor.getClientQueryId(queryId), response, msg.sender);
        }
        

    }
    function deltaTally(uint256 queryId, int response, address sender){
        int256 delta = int(stor.getDelta(queryId));
        int[] memory intarr = stor.getIntResponses(queryId);
        for(uint i=0; i < intarr.length; i++){
                if( response >= intarr[i] - delta && 
                    response <= intarr[i] + delta){
                        emit Result1(uint256(response),"response");
                        emit Result1(uint256(intarr[i]),"intarr[i]");
                        stor.tallyResponse(queryId,intarr[i]);
                }
            }
        stor.addIntResponse(queryId, response, sender);
    }
    function intResponse(uint256 queryId, int response, address sender) internal{
        // int[] response.push(response)
        // int256 delta = int(stor.getDelta(queryId));
        // int[] memory intarr = stor.getIntResponses(queryId);
        // for(uint i=0; i < intarr.length; i++){
        //         if( response >= intarr[i] - delta && 
        //             response <= intarr[i] + delta){
        //                 emit Result1(uint256(response),"response");
        //                 emit Result1(uint256(intarr[i]),"intarr[i]");
        //                 stor.tallyResponse(queryId,intarr[i]);
        //         }
        //     }
        // stor.addIntResponse(queryId, response, sender);
        deltaTally(queryId,response,sender);

        int[] memory intarr = stor.getIntResponses(queryId);
        if(intarr.length==stor.getNumResponders()){
            int[] storage responseArr;
            for(uint i=0; i<intarr.length; i++){
                if(stor.getTally(queryId, intarr[i]) >= int(stor.getThreshold(queryId))) {
                    responseArr.push(intarr[i]);
                }
            }
            
            stor.setQueryStatus(queryId, 2);
            dispatch.respondIntArray(queryId, stor.getAverage(responseArr));
            // dispatch.respondIntArray(queryId, responseArr);
        }
    }

  }
    

