pragma solidity ^0.4.24;

import "../contracts/MultiPartyOracle.sol";
import "../contracts/MPOStorage.sol";
import "truffle/DeployedAddresses.sol";
import "truffle/Assert.sol";

contract Test_MPO {

	function testStorage() {
		MPOStorage stor = MPOStorage(DeployedAddresses.MPOStorage());
		uint expected = 1;
		Assert.equal(stor.getThreshold(), expected, "Threshold should equal 50!");
	}

	function testTheOracle() {
		MultiPartyOracle mpo = MultiPartyOracle(DeployedAddresses.MultiPartyOracle());
		mpo.submitResponse1(1234, "Test query");
	}
}