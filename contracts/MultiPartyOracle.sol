pragma solidity ^0.4.24;

import "./MPOStorage.sol";
import "./lib/Destructible.sol";
import "./lib/ZapInterface.sol";
// import "./ECRecovery.sol";
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
    address aggregator; 

    bytes32 public spec3 = "Nonproviders";
    int256[] curve3 = [1,1,1000000000];
    // @notice constructor that sets up zap registry, dispatch, and MPO storage. Also sets up registry provider curve
    // @param address registryAddress
    // @param address _dispatchAddress
    // @param address mpoStorageAddress
    constructor(address _zapCoord, address mpoStorageAddress, address _aggregator) public{
        // require(_responders.length<=stor.getNumResponders(), "Soft Cap reached");
        registryAddress = ZapInterface(_zapCoord).getContract("REGISTRY");
        registry = ZapInterface(registryAddress);
        dispatchAddress = ZapInterface(_zapCoord).getContract("DISPATCH");
        dispatch = ZapInterface(dispatchAddress);
        stor = MPOStorage(mpoStorageAddress);
        aggregator = _aggregator;
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
        uint256 threshold = uint(endpointParams[2]);
        require(threshold > 0 && threshold <= parties.length,"Invalid Threshold Length");
        stor.setThreshold(id, threshold );
        stor.setPrecision(id, uint(endpointParams[3]) );
        stor.setDelta(id, uint(endpointParams[4]) );
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

    function deltaTally(uint256 queryId, uint256 response) internal{
        uint256 delta = stor.getDelta(queryId)*(10**stor.getPrecision(queryId));
        uint256[] memory intarr = stor.getResponses(queryId);
        // For each  approved response, compare new response to each, and tally each value that falls within intarr[i] +/- delta
        for(uint256 i=0; i < intarr.length; i++){
            if( intarr[i] - delta <= response  && response <= intarr[i] + delta){
                stor.tallyResponse(queryId,intarr[i]);
                if(stor.getTally(queryId, intarr[i]) == stor.getThreshold(queryId)) {
                    stor.addThresholdResponse(queryId, response);
                }
            }
        }
    }

    // @notice callback used by dispatch or nonproviders once a response has been created for the query
    // @param queryId MPO or dispatch generated MPOID to used to determine client query ID
    // @param response Response to be returned to client
    // @dev query status is 1 if receiving from offchain, 2 if from onchain.
    function callback(uint256 mpoId, uint256[] responses, bytes32[] msgHash, uint8[] sigv, bytes32[] sigrs) external {
        require(msg.sender == aggregator, "Invalid aggregator");
        
        uint256 queryId = stor.getClientQueryId(mpoId);
        address sender;
        for(uint i=0;i<stor.getNumResponders();i++){
            sender = ecrecover(msgHash[i],sigv[i],sigrs[2*i],sigrs[2*i+1]);
            emit ReceivedResponse(queryId, sender, "address after ecrecover");
            // If address is in whitelist
            if( stor.getAddressStatus(sender) ){
                    emit Result1(responses[i]*(10**stor.getPrecision(queryId)), "test");
                    stor.addResponse(queryId, responses[i]*(10**stor.getPrecision(queryId)), sender);
                    deltaTally(queryId, responses[i]*(10**stor.getPrecision(queryId)));
                }
        }

        // Query status 0 = not started, 1 = in progress, 2 = complete
        if(stor.getQueryStatus(queryId) == 1) {
            // If enough answers meet the threshold send back the average of the answers
            if(stor.getThresholdResponses(queryId).length != 0){
                stor.setQueryStatus(queryId, 2);
                dispatch.respondIntArray(queryId, stor.getAverage(stor.getThresholdResponses(queryId)));
                // dispatch.respondIntArray(queryId, stor.getThresholdResponses(queryId));
            }
        }
        

    }

  }
    

