var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {

    dev_hd: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*',
      gas: 4712388,
      gasPrice: 100000000000,
    },

    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: '*',
      gas: 4712388,
      gasPrice: 100000000000,
    },

    truffle_dev: {
      host: "127.0.0.1",
      port: 9545,
      network_id: '*',
      gas: 6721975,
      gasPrice: 20000000000,
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/v3/c25da12026e24183a713e995b08b56e7")
      },
      network_id: '4',
      gas: 4500000,
      gasPrice: 10000000000,
    }
  },
};