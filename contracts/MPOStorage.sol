pragma solidity ^0.4.19;

contract MPOStorage{

	struct response{
		address party;
		string res;
	}
	mapping(response=>uint) queryToResponses;
	uint[] queries;
	
}