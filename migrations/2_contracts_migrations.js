//var Migrations = artifacts.require("./Migrations.sol");
var MPOStorage = artifacts.require("./MPOStorage.sol");
var MultiPartyOracle = artifacts.require("./MultiPartyOracle.sol");

module.exports = function(deployer) {
  //deployer.deploy(Migrations);
  deployer.deploy(MPOStorage).then(() => {
  	console.log("Is there an address: " + MPOStorage.address);
  	//return deployer.deploy(MultiPartyOracle, MPOStorage.address, [], 0x0, 3);
  });
};
