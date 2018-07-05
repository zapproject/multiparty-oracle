const web3 = require("web3");
const assert = require("assert");
const fs = require("fs");
const path = require("path");

// const ZapArbiterArtifact = artifacts.require("Arbiter")

const netConfig = require("../config/network");

const w3 = new web3(netConfig.host);

const ZapArbiterArtifact = artifacts.require("Arbiter");
const ZapBondageArtifact = artifacts.require("Bondage");
const ZapBondageStorageArtifact = artifacts.require("BondageStorage");
const ZapDispatchArtifact = artifacts.require("Dispatch");
const ZapRegistryArtifact = artifacts.require("Registry");
const ZapTokenArtifact = artifacts.require("ZapToken");

// ZapArbiterArtifact = JSON.parse(fs.readFileSync(path.join(__dirname,'../build/contracts/Arbiter.json')));
// ZapBondageArtifact = JSON.parse(fs.readFileSync(path.join(__dirname,'../build/contracts//Bondage.json')));
// ZapBondageStorageArtifact = JSON.parse(fs.readFileSync(path.join(__dirname,'../build/contracts/BondageStorage.json')));
// ZapDispatchArtifact = JSON.parse(fs.readFileSync(path.join(__dirname,'../build/contracts/Dispatch.json')));
// ZapRegistryArtifact = JSON.parse(fs.readFileSync(path.join(__dirname,'../build/contracts/Registry.json')));
// ZapTokenArtifact = JSON.parse(fs.readFileSync(path.join(__dirname,'../build/contracts/ZapToken.json')));
module.exports = {
    BASE: 1000000000000000000,
    web3 : w3,
    zapRegistry : new w3.eth.Contract(ZapRegistryArtifact.abi,
        ZapRegistryArtifact.networks[netConfig.netId].address),
    zapToken : new w3.eth.Contract(ZapTokenArtifact.abi,
        ZapTokenArtifact.networks[netConfig.netId].address),
    zapBondage : new w3.eth.Contract(ZapBondageArtifact.abi,
        ZapBondageArtifact.networks[netConfig.netId].address),
    zapArbiter: new w3.eth.Contract(ZapArbiterArtifact.abi,
        ZapArbiterArtifact.networks[netConfig.netId].address),
    zapDispatch : new w3.eth.Contract(ZapDispatchArtifact.abi,
        ZapDispatchArtifact.networks[netConfig.netId].address)
};
