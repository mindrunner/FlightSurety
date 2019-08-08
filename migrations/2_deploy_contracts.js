const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = function(deployer) {

    deployer.deploy(FlightSuretyData)
    .then(() => {
        return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then(async () => {
                    const instances = await Promise.all([
                        FlightSuretyData.deployed(),
                        FlightSuretyApp.deployed()
                    ]);
                    // App Contract needs to be added to map of authorized ones in Data Contract
                    let result = await instances[0].authorizeCaller(FlightSuretyApp.address);

                    let config = {
                        localhost: {
                            // url: 'https://rinkeby.infura.io/v3/c25da12026e24183a713e995b08b56e7',
                            url: 'http://localhost:7545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        }
                    };
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                });
    });
};