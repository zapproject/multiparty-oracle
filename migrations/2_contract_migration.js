//var Migrations = artifacts.require("./Migrations.sol");
var MPOStorage = artifacts.require("./MPOStorage.sol");
var MultiPartyOracle = artifacts.require("./MultiPartyOracle.sol");
const ZapCoordinator = artifacts.require('./ZapCoordinator.sol');
const Database = artifacts.require('./Database.sol');

const Arbiter = artifacts.require("./Arbiter.sol");
const Bondage = artifacts.require("./Bondage.sol");
const CurrentCost = artifacts.require("./CurrentCost.sol");
const Dispatch = artifacts.require("./Dispatch.sol");
const Registry = artifacts.require("./Registry.sol");

const Faucet = artifacts.require("./Faucet.sol");
const Telegram = artifacts.require("./Telegram.sol");
const ZapToken = artifacts.require("./ZapToken.sol");
const deploy = async function(deployer, network) {

  //deployer.deploy(Migrations);
  if(network == "development"){
    console.log("Deploying main contracts on: " + network);
    deployer.deploy(ZapToken);
    // Deploy all the coordinator
    console.log('Deploying the coordinator');
    await deployer.deploy(ZapCoordinator);
    const coordInstance = await ZapCoordinator.deployed();
    const owner = await coordInstance.owner();

    // Setup important contracts
    console.log('Deploying and instantiating important contracts');
    await deployer.deploy(Database);
    const dbInstance = await Database.deployed();
    await dbInstance.transferOwnership(ZapCoordinator.address);

    await coordInstance.addImmutableContract('ZAP_TOKEN', ZapToken.address);
    await coordInstance.addImmutableContract('DATABASE', Database.address);

    // Deploy the rest of the contracts
    console.log('Deploying the rest of the contracts');
    await deployer.deploy(Registry, ZapCoordinator.address);
    await deployer.deploy(CurrentCost, ZapCoordinator.address);
    await deployer.deploy(Bondage, ZapCoordinator.address);
    await deployer.deploy(Arbiter, ZapCoordinator.address);
    await deployer.deploy(Dispatch, ZapCoordinator.address);

    // Add the above contracts to the coordinator 
    console.log('Adding contracst to the coordinator');
    await coordInstance.updateContract('REGISTRY', Registry.address);
    await coordInstance.updateContract('CURRENT_COST', CurrentCost.address);
    await coordInstance.updateContract('BONDAGE', Bondage.address);
    await coordInstance.updateContract('ARBITER', Arbiter.address);
    await coordInstance.updateContract('DISPATCH', Dispatch.address);

    console.log('Updating all the dependencies');
    await coordInstance.updateAllDependencies({ from: owner });

    // Deploy telegram example
    console.log('Done migrating core contracts');
    await deployer.deploy(MPOStorage);
    console.log(typeof(MPOStorage.address));
    const storageInstance = await MPOStorage.deployed();
    await deployer.deploy(MultiPartyOracle, ZapCoordinator.address, MPOStorage.address)
    const MPOInstance = await MultiPartyOracle.deployed();
    await storageInstance.transferOwnership(MultiPartyOracle.address);
    await MPOInstance.setup(["0xdbFE35a91EaA4c97456238ee60C48D0708272242",  "0x1096C36e95A3A1cff73d8d006C9dDEaAe5B85eCc",  "0x7e75C377c183A8f69eE57E2cCdAa3A016f5a5903"])
	}
  else{

    // TODO: handle networks from artifacts. For now, assume Kovan
    await deployer.deploy(MPOStorage);
    console.log(typeof(MPOStorage.address));
    const storageInstance = await MPOStorage.deployed();

    await deployer.deploy(MultiPartyOracle, "0x0014f9acd4f4ad4ac65fec3dcee75736fd0a0230", MPOStorage.address)
    const MPOInstance = await MultiPartyOracle.deployed();
    await storageInstance.transferOwnership(MultiPartyOracle.address);
    await MPOInstance.setup(["0xdbFE35a91EaA4c97456238ee60C48D0708272242",  "0x1096C36e95A3A1cff73d8d006C9dDEaAe5B85eCc",  "0x7e75C377c183A8f69eE57E2cCdAa3A016f5a5903"])
    }
};
module.exports = (deployer, network) => {
    deployer.then(async () => await deploy(deployer, network));
};
function sleep(network) {
    if ( network == "kovan" ) {
        return new Promise(resolve => setTimeout(resolve, 30000));
    }
}
