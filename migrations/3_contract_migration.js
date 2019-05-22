//var Migrations = artifacts.require("./Migrations.sol");
var MPOStorage = artifacts.require("./MPOStorage.sol");
var MultiPartyOracle = artifacts.require("./MultiPartyOracle.sol");

const deploy = async function(deployer, network) {

  //deployer.deploy(Migrations);
  await deployer.deploy(MPOStorage);
  const storageInstance = await MPOStorage.deployed();
  await deployer.deploy(MultiPartyOracle, "0x0014f9acd4f4ad4ac65fec3dcee75736fd0a0230", MPOStorage.address, MPOStorage.address)
  const MPOInstance = MultiPartyOracle.deployed();
  await storageInstance.transferOwnership(MultiPartyOracle.address);
  await MPOInstance.setup(["0xdbFE35a91EaA4c97456238ee60C48D0708272242",  "0x1096C36e95A3A1cff73d8d006C9dDEaAe5B85eCc",  "0x7e75C377c183A8f69eE57E2cCdAa3A016f5a5903"])
  
};
module.exports = (deployer, network) => {
    deployer.then(async () => await deploy(deployer, network));
};
function sleep(network) {
    if ( network == "kovan" ) {
        return new Promise(resolve => setTimeout(resolve, 30000));
    }
}