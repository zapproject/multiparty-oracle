pragma solidity ^0.4.24;

contract MPOStorage{



	mapping(uint256 => bytes32[]) queryResponses; // List of query responses. functionally unnecessary, used for testing purposes
	mapping(address => bool) approvedAddress; // check if msg.sender is in global approved list of responders
	mapping(uint256 => bool) queryFulfilled;// Threshold reached, do not accept any more responses
	mapping(uint256 => mapping(string => uint256) ) responseTally; // Tally of each response.
	mapping(uint256 => mapping(address => bool)) oneAddressResponse; // Make sure each party can only submit one response

	
	uint256 threshold;
	address[] responders;

	// implements Client1
	address client; 


	//Set Methods/Mutators
	function setThreshold(uint256 _threshold) public {
		threshold = _threshold;
	}

	function setClient(address _client) public {
		client = _client;
	}
 
	function setResponders(address[] parties) public {
		for(uint256 i=0;i<parties.length;i++){
			responders.push(parties[i]);
			approvedAddress[parties[i]]=true;
		}
	}
	// function addResponse(uint256 queryId, string response, address responder){
	// 	queryResponses[queryId].push(keccak256(response));
	// 	oneAddressResponse[queryId][responder]=true;
	// 	responseTally[queryId][keccak256(response)]++;
	// }
	function fulfillQuery(uint queryId) public {
		queryFulfilled[queryId]=true;
	}

	function addResponse(uint256 queryId, string response, address party) public {
		// queryResponses[queryId].push(response);
		responseTally[queryId][response]++;
		oneAddressResponse[queryId][party]=true;
	}
	//Get Methods/Accessors

	function onlyOneResponse(uint256 queryId, address party) public view returns(bool) {
		return oneAddressResponse[queryId][party];
	}
	function getThreshold() public view returns(uint) { 
		return threshold;
	}
	function getAddressStatus(address party) public view returns(bool){
		return approvedAddress[party];
	}
// 	function getTally(uint256 queryId, string response) returns(uint256){
// 		return responseTally[queryId][keccak256(response)];
// =======
	function getTally(uint256 queryId, string response) public view returns(uint256){
		return responseTally[queryId][response];
	}

	function getClient() public view returns (address){
		return client;
	}
	function getQueryStatus(uint256 queryId) public view returns(bool){
		return queryFulfilled[queryId];
	}

	function getNumResponders() public view returns (uint) {
		return responders.length;
	}

	function getResponderAddress(uint index) public view returns (address){
		return responders[index];
	}
}
