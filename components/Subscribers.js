;const contracts = require("./ContractsData");
const assert = require("assert");
const web3 = contracts.web3;
const utils = require("./utils")

class Subscriber{
    constructor({owner}){
      assert(owner,"owner address required");
      this.owner = owner;
    }

    async getZapBalance(){
        let balance =  await contracts.zapToken.methods.balanceOf(this.owner).call()
        return utils.fromBase(balance.valueOf())
    }

    async getBoundDots({provider,endpoint}){
        assert(provider&&endpoint,"missing args: provider, endpoint");
        let boundDots = await contracts.zapBondage.methods.getBoundDots(
            this.owner,
            provider,
            web3.utils.utf8ToHex(endpoint)
        ).call();
        return parseInt(boundDots)

    }

    async bond({provider,endpoint,zapAmount}){
        assert(provider&&endpoint&&zapAmount,
            "missing args, require: provider,endpoint,zapAmount");
      let zapAmountBig = utils.toBase(zapAmount)
      let approve = await contracts.zapToken.methods.approve(
          contracts.zapBondage._address,
          zapAmountBig).send({from:this.owner});
      let bonded = await contracts.zapBondage.methods.bond(
          provider,
          web3.utils.utf8ToHex(endpoint),
          web3.utils.toHex(zapAmount)
        ).send({from:this.owner,gas:600000});
          return bonded;
    }

    async unbond({provider,endpoint,numDots}){
        let unbonded = await contracts.zapBondage.methods.unbond(
            provider,
            web3.utils.utf8ToHex(endpoint),
            web3.utils.toHex(numDots)
        ).send({from:this.owner});
        return unbonded;
    }

    async delegateBond({provider, subscriber, endpoint, zapAmount}){
        assert(provider&&subscriber&&endpoint&&zapAmount,
            "missing args, require: provider, subscriber, endpoint, zapAmount");
        let zapAmountBig = utils.toBase(zapAmount)
        let approve = await contracts.zapToken.methods.approve(
            contracts.zapBondage._address,
            zapAmountBig).send({from:this.owner});
        let bonded = await contracts.zapBondage.methods.delegateBond(
            subscriber,
            provider,
            web3.utils.utf8ToHex(endpoint),
            web3.utils.toHex(zapAmount)
        ).send({from:this.owner});
        return bonded;
    }

    async resetDelegate({provider}){
        let reset = await contracts.zapBondage.methods.resetDelegate(provider)
            .send({from:this.owner})
    }


    async queryData({provider,endpoint,query,params, onchainProvider, onchainSubscriber}){
        assert(provider&&endpoint&&query&&params,
            "missing args, require: " +
            "provider,endpoint,query,params, onchainProvider, onchainSubscriber");
        for(let i in params){
            params[i] = web3.utils.utf8ToHex(params[i]);
        }
        let resultQuery = await contracts.zapDispatch.methods.query(
            provider,
            query,
            web3.utils.utf8ToHex(endpoint),
            params,   // endpoint-specific params
            onchainProvider,
            onchainSubscriber).send({from:this.owner,gas:6000000});
        console.log("result query :" ,resultQuery);
        return resultQuery;
    }

    async initiateSubscription({provider,endpoint,params,pubkey,blocks}){
        assert(provider&&endpoint&&params&&pubkey&&blocks,
            "missing args, require : " +
            "provider,endpoint,params,pubkey,blocks")
        for(let i in params){
            params[i] = web3.utils.utf8ToHex(params[i])
        }
        let subscribe = await contracts.zapArbiter.methods.initiateSubscription(
            provider,
            web3.utils.utf8ToHex(endpoint),
            params,
            web3.utils.toBN(pubkey),
            web3.utils.toBN(blocks)
        ).send({from:this.owner});
        return subscribe
    }

    async getSubscription({provider, endpoint}){
        assert(provider && endpoint, "missing args, require: provider, endpoint");
        let subsciption = await contracts.zapArbiter.methods.getSubscription(
            provider,
            this.owner,
            web3.utils.utf8ToHex(endpoint)
        ).call();
        return subsciption;
    }

    async endSubscriptionSubscriber({provider,endpoint}){
        assert(provider && endpoint, "missing args, require: provider, endpoint");
        let endSub = await contracts.zapArbiter.methods.endSubscriptionSubscriber(
            provider,web3.utils.utf8ToHex(endpoint)).send({from:this.owner});
        return endSub
    }

    listenToResponse({id,provider,callback}){
        console.log("args : ", id, provider)
        assert(id && provider,
            "missing args, require : id, provider");
        let responseFilter = contracts.zapDispatch.events.OffchainResponse({
            id: web3.utils.toBN(id),
            provider:provider,
            subscriber: this.owner
            },{fromBlock:0,
            toBlock:'latest'});
        responseFilter.watch(callback)
    }

    getResponseEvent({id,provider,fromBlock,callback}){
        assert(id && provider,
            "missing args, require : id, provider");
        console.log(id,provider,fromBlock)
        contracts.zapDispatch.getPastEvents("OffchainResult2",{
            id: web3.utils.toBN(id),
            provider:provider,
            subscriber: this.owner,
            fromBlock:fromBlock,
            toBlock:'latest'
        },(err,res)=>{callback(err,res)})
    }
}

module.exports = Subscriber;
