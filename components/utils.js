let contracts = require("./ContractsData")
const web3 = contracts.web3


function getPowOfTenBN(numberOfZeros) {
    let str = '1';
    for (let i = 0; i < numberOfZeros; i++) {
        str += '0';
    }
    return new web3.utils.BN(str);
}
function toBase(num){
    return web3.utils.toBN(num).mul(web3.utils.toBN(10).pow(web3.utils.toBN(18)))
}

function fromBase(num){
    return web3.utils.toBN(num).div(web3.utils.toBN(10).pow(web3.utils.toBN(18))).toNumber()
}

async function getMockZap(address){
    let owner = await contracts.zapToken.methods.owner().call();
    let subBalance = (await contracts.zapToken.methods.balanceOf(address).call()).valueOf();
    if(toBase(50).gt(subBalance))
        await contracts.zapToken.methods.allocate(address,toBase(1000)).send({from:owner, gas:200000});
    console.log((await contracts.zapToken.methods.balanceOf(address).call()))
    return subBalance
}


module.exports = {
    getPowOfTenBN,
    toBase,
    fromBase,
    getMockZap
}
