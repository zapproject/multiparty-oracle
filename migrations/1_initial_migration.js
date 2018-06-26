var Migrations = artifacts.require("./Migrations.sol");
var MPOStorage = artifacts.require("./MPOStorage.sol");
var MultiPartyOracle = artifacts.require("./MultiPartyOracle.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);


};
