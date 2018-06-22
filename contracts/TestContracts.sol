pragma solidity ^0.4.24;

import "./OnChainProvider.sol";
import "./Client.sol";
import "./MultiPartyOracle.sol";

contract TestProvider is OnChainProvider {
	event RecievedQuery(string query, bytes32 endpoint, bytes32[] params);

    event TEST(uint res, bytes32 b, string s);

    // specifier doesn't matter in this case
    bytes32 public spec1 = "Hello?";

    string response;

    constructor(string _response) public {
        response = _response;    
    }

    // middleware function for handling queries
	function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams) external {
        emit RecievedQuery(userQuery, endpoint, endpointParams);
        Client1(msg.sender).callback(id, response);
	}
}

contract MaliciousProvider is OnChainProvider {
    event RecievedQuery(string query, bytes32 endpoint, bytes32[] params);
    event TEST(uint res, bytes32 b, string s);

    MultiPartyOracle mpo;
    address public MPO_address;

    // specifier doesn't matter in this case
    bytes32 public spec1 = "Hello?";
    string response;

    constructor(string _response, address _MPO_address) public {
        response = _response;
        MPO_address = _MPO_address;    
    }

    // middleware function for handling queries
    function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams) external {
        emit RecievedQuery(userQuery, endpoint, endpointParams);
        Client1(MPO_address).callback(id, response);
    }
}

/* Test Subscriber Client */
contract TestClient is Client1{

	event Result1(uint256 id, string response1);

    /*
    Implements overloaded callback functions for Client1
    */
    function callback(uint256 id, string response1) external {
    	string memory _response1 = response1;
    	emit Result1(id, _response1);
        // do something with result
    }

    function testQuery(address oracleAddr, string query, bytes32 specifier, bytes32[] params) external {
    	OnChainProvider(oracleAddr).receive(100, query, specifier, params);
    }

}
