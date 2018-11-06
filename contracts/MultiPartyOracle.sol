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

    bytes32 public spec1 = "Offchain";
    int256[] curve1 = [1,1,1000000000];
    bytes32 public spec2 = "Onchain";
    int256[] curve2 = [1,1,1000000000];
    bytes32 public spec3 = "Nonproviders";
    int256[] curve3 = [1,1,1000000000];
    // curve 2x^2
    // @notice constructor that sets up zap registry, dispatch, and MPO storage. Also sets up registry provider curve
    // @param address registryAddress
    // @param address _dispatchAddress
    // @param address mpoStorageAddress
    
    constructor(address _zapCoord, address mpoStorageAddress) public{

        registryAddress = ZapInterface(_zapCoord).getContract("REGISTRY");
        registry = ZapInterface(registryAddress);
        dispatchAddress = ZapInterface(_zapCoord).getContract("DISPATCH");
        dispatch = ZapInterface(dispatchAddress);
        stor = MPOStorage(mpoStorageAddress);
        // dispatchAddress = _dispatchAddress;


        // initialize in registry
        bytes32 title = "MultiPartyOracle";

        // bytes32[] memory params = new bytes32[](2);
        // params[0] = "p1";

        registry.initiateProvider(12345, title);
        registry.initiateProviderCurve(spec1, curve1, address(0));
        registry.initiateProviderCurve(spec2, curve2, address(0));
        registry.initiateProviderCurve(spec3, curve3, address(0));

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
        require(stor.getThreshold() > 0 && stor.getThreshold() <= stor.getNumResponders(), "Threshold not set/Invalid Threshold");    
        require(msg.sender == dispatchAddress && stor.getQueryStatus(id) == 0 );

        bytes32 hash = keccak256(abi.encodePacked(endpoint));
        if(hash == keccak256(abi.encodePacked(spec1))) {
            stor.setQueryStatus(id,1);
            endpoint1(id, userQuery, endpointParams);
        }
        // For Offchain providers
        else if(hash == keccak256(abi.encodePacked(spec2))) {
            stor.setQueryStatus(id,2);
            stor.setClientQueryId(id);
            endpoint1(id, userQuery, endpointParams);
        }
        else if(hash == keccak256(abi.encodePacked(spec3))) {
            stor.setQueryStatus(id,1);
            stor.setClientQueryId(id);
            endpoint2(id, userQuery, endpointParams);
        }
    }

    // @notice Pseudo Constructor that sets providers and threshold required to call back dispatch
    // @param address[] _responders list of providers to query with client query
    // @param uint256 _threshold the MPO must reach a number of similar responses equal to this amount before calling dispatch.respond
    function setParams(address[] _responders, uint256 _threshold) public {
        require(_threshold>0 && _threshold <= _responders.length, "Invalid Threshold Length");    
        stor.setThreshold(_threshold);
        stor.setResponders(_responders);
    }

    //@Notice query Zap Registered providers
    // @param uint256 id Client query ID, passed to dispatch and stored in a mapping to dispatch generated MPO IDs
    // @param string userQuery passed to provider for use
    // @param bytes32[] endpointParams passed to provider for use
    function endpoint1(uint256 id, string userQuery, bytes32[] endpointParams) internal{
       //set query status to 1
        uint i;
        if(keccak256(abi.encodePacked(userQuery)) == keccak256("Hello?")) {
            for(i=0; i<stor.getNumResponders(); i++) {      
                stor.setClientQueryId(dispatch.query(stor.getResponderAddress(i), userQuery, "Hello?", endpointParams),
                                id);
            }
        } else if(keccak256(abi.encodePacked(userQuery)) == keccak256("Reverse")) {
            for(i=0; i<stor.getNumResponders(); i++) {      
                stor.setClientQueryId(dispatch.query(stor.getResponderAddress(i), userQuery, "Reverse", endpointParams),
                                id);
            }
        }
    }

    // @notice query nonproviders(Offchain providers not registered through zap dispatch)
    // @param uint256 id Client query ID,used to generate MPO IDs and map to them
    // @param string userQuery passed to provider for use
    // @param bytes32[] endpointParams passed to provider for use
    function endpoint2(uint256 id, string userQuery, bytes32[] endpointParams) internal{
        uint256 mpoid;
        for(uint i=0; i<stor.getNumResponders(); i++) {      
            mpoid=uint256(keccak256(abi.encodePacked(
                            block.number, now, userQuery,id,stor.getResponderAddress(i)
                            )));
            stor.setClientQueryId(mpoid, id);
            emit Incoming(mpoid, stor.getResponderAddress(i),this, userQuery, "Hello?", endpointParams, true);
                
        }
    }

    // @notice callback used by dispatch or nonproviders once a response has been created for the query
    // @param queryId MPO or dispatch generated MPOID to used to determine client query ID
    // @param response Response to be returned to client
    // @dev query status is 1 if receiving from offchain, 2 if from onchain.
    function callback(uint256 queryId, string response) external {
        require(msg.sender == dispatchAddress||
        (stor.getAddressStatus(msg.sender) &&
        !stor.onlyOneResponse(stor.getClientQueryId(queryId),msg.sender)), "Invalid Sender/Response sent twice");
        
        if(stor.getQueryStatus(stor.getClientQueryId(queryId)) == 1){
            strResponse(stor.getClientQueryId(queryId), response, msg.sender);
        }
        else if(stor.getQueryStatus(stor.getClientQueryId()) == 2){
            strResponse(stor.getClientQueryId(), response, msg.sender);
        }

    }
    function strResponse(uint256 queryId, string response, address sender) internal {
        stor.addResponse(queryId, response, sender);
        emit ReceivedResponse(queryId, sender, response);
        if(stor.getTally(queryId, response) >= stor.getThreshold()) {
            stor.setQueryStatus(queryId, 3);
            emit Result1(queryId, response);
            dispatch.respond1(queryId, response);
        }
    }
    function callback(uint256 queryId, int[] responses) external {
        require(msg.sender == dispatchAddress||
        (stor.getAddressStatus(msg.sender) &&
        !stor.onlyOneResponse(stor.getClientQueryId(queryId),msg.sender)),"Invalid Sender/Response sent twice");

        int response = responses[0];
        if(stor.getQueryStatus(stor.getClientQueryId(queryId)) == 1){
            intResponse(stor.getClientQueryId(queryId), response, msg.sender);
        }
        else if(stor.getQueryStatus(stor.getClientQueryId()) == 2){
            intResponse(stor.getClientQueryId(), response, msg.sender);
        }

    }
    function intResponse(uint256 queryId, int response, address sender) internal{
        // int[] response.push(response)
        stor.addIntResponse(queryId, response, sender);
        // find median when all responders answer
        if(stor.getIntResponses(queryId).length==stor.getNumResponders()){
            int median = stor.getMedian(queryId);
            // make new int array
            uint256 c =stor.getThreshold();
            int[] memory consensus = new int[](c);
            int delta = int(stor.getDelta());
            // populate with values from response array such that median-delta<response<median+delta
            for(uint i=0; i<stor.getIntResponses(queryId).length; i++){
                if(median - delta < response && response < median + delta){
                    consensus[c]=response;
                    c--;
                    if(c<=0){break;}
                }
            }
            if (consensus.length>=stor.getThreshold()){
                dispatch.respondIntArray(queryId, stor.getAverage(queryId));
            }
            // return average of consensus array if threshold is met
        }
    }
    

}