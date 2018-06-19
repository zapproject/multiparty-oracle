//var Migrations = artifacts.require("./Migrations.sol");
var MPOStorage = artifacts.require("./MPOStorage.sol");
var MultiPartyOracle = artifacts.require("./MultiPartyOracle.sol");

module.exports = function(deployer) {
  //deployer.deploy(Migrations);
  deployer.deploy(MPOStorage).then(() => {
  	console.log("Is there an address: " + MPOStorage.address);
  	return deployer.deploy(MultiPartyOracle, MPOStorage.address, [0x8f7d43c7b17dbedb9dd9fc870116ba5c67bcb782, 0xc54c113de6c435c16d09cf7374ee57219ce9f87e], 1)
  });
};
