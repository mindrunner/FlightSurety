pragma solidity ^0.5.8;
pragma experimental ABIEncoderV2;
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;
    bool private operational = true;

    struct Airline {
        bool isRegistered;
        string name;
        address wallet;
    }

    struct Insurance {
        Flight flight;
        uint256 value;
        address customer;
    }

    struct Flight {
        string name;
        bool isRegistered;
        address airline;
        uint statusCode;
        uint256 updatedTimestamp;
    }

    uint private airlineCount = 0;

    mapping(bytes32 => Flight) private flights;
    bytes32[] private flight_keys = new bytes32[](0);
    mapping(address => Airline) private airlines;
    mapping(address => Insurance) private insurances;
    address[] private insurees = new address[](0);
    mapping(address => uint256) private payouts;
    mapping(address => uint256) private funds;
    mapping(address => uint256) private authorizedContracts;

    uint256 private constant MAX_INSURANCE_POLICY = 1 ether;
    uint256 private constant AIRLINE_MIN_FUNDS = 10 ether;

    event InsureeCredited(address insuree, uint credit, uint total);
/********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
    (
    )
    public
    {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;
        // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier isCallerAuthorized() {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    // Define a modifier that checks if the paid amount is sufficient to cover the price
    modifier paidInRange() {
        require(msg.value >= 0, "Nothing was paid for the insurance");
//        require(msg.value <= MAX_INSURANCE_POLICY, "Paid too much");
        _;
    }

    // Define a modifier that checks the price and refunds the remaining balance
    modifier checkAndRefund(address insuree) {
        _;
        if (msg.value > MAX_INSURANCE_POLICY) {
            uint amountToReturn = msg.value - MAX_INSURANCE_POLICY;
            payouts[insuree] += amountToReturn;
            emit InsureeCredited(insuree, amountToReturn, payouts[insuree]);
        }
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
    public
    view
    returns (bool)
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
    (
        bool mode
    )
    external
    requireContractOwner
    {
        operational = mode;
    }

    function authorizeCaller(address caller) public requireContractOwner {
        require(authorizedContracts[caller] == 0, "Address already authorized");
        authorizedContracts[caller] = 1;
    }

    function deauthorizeCaller(address caller) public requireContractOwner {
        require(authorizedContracts[caller] == 1, "Address was not authorized");
        authorizedContracts[caller] = 0;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline
    (
        string calldata name,
        address wallet
    )
    external
    isCallerAuthorized
    {
        require(!airlines[wallet].isRegistered, "Airline is already registered.");

        airlines[wallet] = Airline({name : name, isRegistered : true, wallet : wallet});
        airlineCount = airlineCount.add(1);
    }

    function getAirlineCount() public view returns (uint256) {
        return airlineCount;
    }

    function getFlights() public view returns (string[] memory, address[] memory, uint256[] memory) {
        uint l = flight_keys.length;
        string[] memory names = new string[](l);
        address[] memory airline_addr = new address[](l);
        uint256[] memory timestamps = new uint256[](l);

        for(uint i = 0; i < l; ++i) {
            bytes32 key = flight_keys[i];
            names[i] = flights[key].name;
            airline_addr[i] = flights[key].airline;
            timestamps[i] = flights[key].updatedTimestamp;
        }

        return (names, airline_addr, timestamps);
    }

    function isAirlineRegistered(address wallet) external view returns (bool) {
        return airlines[wallet].isRegistered;
    }

    function isAirlineFunded(address wallet) external view returns (bool) {
        return funds[wallet] >= AIRLINE_MIN_FUNDS;
    }

    function registerFlight(string calldata name, uint256 timestamp, address airline) external isCallerAuthorized {
        bytes32 id = getFlightKey(airline, name, timestamp);
        require(!flights[id].isRegistered, "Flight is already registered.");
        Flight memory f = flights[id];
        f.name = name;
        f.isRegistered = true;
        f.airline = airline;
        f.statusCode = 0;
        f.updatedTimestamp = timestamp;
        // flights[id] = Flight({name : name, isRegistered : true, airline : airline, statusCode: 0, updatedTimestamp : timestamp});
        flight_keys.push(id);
    }

    function updateFlight(string calldata name, uint256 timestamp, address airline, uint8 statusCode)
    external isCallerAuthorized {
        bytes32 id = getFlightKey(airline, name, timestamp);
        require(flights[id].isRegistered, "Flight is not registered.");
        flights[id].statusCode = statusCode;
    }


    function isFlightRegistered(address airline, string calldata name, uint256 timestamp) external view returns (bool) {
        bytes32 id = getFlightKey(airline, name, timestamp);
        return flights[id].isRegistered;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy
    (
        address airline,
        string calldata flight,
        uint256 timestamp,
        address insuree
    )
    external
    payable
    isCallerAuthorized
    paidInRange
    checkAndRefund(insuree)
    {
        bytes32 id = getFlightKey(airline, flight, timestamp);
//        require(flights[id].isRegistered = true, "Flight does not exist");

        uint insurance_value = 0;

        if (msg.value >= MAX_INSURANCE_POLICY) {
            insurance_value = MAX_INSURANCE_POLICY;
        } else {
            insurance_value = msg.value;
        }
        insurances[msg.sender] = Insurance({flight : flights[id], customer : insuree, value: insurance_value});
        insurees.push(insuree);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(address airline, string calldata flight, uint256 timestamp)
    external
    {
        bytes32 id = getFlightKey(airline, flight, timestamp);
        for(uint i = 0; i < insurees.length; ++i) {
            address insuree = insurees[i];
            Insurance memory insurance = insurances[insuree];
            Flight memory f = insurance.flight;
            bytes32 id2 = getFlightKey(f.airline, f.name, f.updatedTimestamp);
            if(id == id2) {
                uint value = insurance.value;
                insurance.value = 0;
                insurances[insuree] = insurance;
                uint refund = value.add(value.div(2));
                payouts[insuree] += refund;
                emit InsureeCredited(insuree, refund, payouts[insuree]);
            }
        }
    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
    (
    )
    external
    isCallerAuthorized
    {
        uint refund = payouts[msg.sender];
        payouts[msg.sender] = 0;
        msg.sender.transfer(refund);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fundForwarded
    (
        address sender
    )
    external
    payable
    isCallerAuthorized
    {
        require(msg.value > 0, "No funds are not allowed");
        funds[sender] = funds[sender].add(msg.value);
    }


    function getFlightKey
    (
        address airline,
        string memory flight,
        uint256 timestamp
    )
    pure
    internal
    returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
    external
    payable
    {
        require(msg.value > 0, "No funds are not allowed");
        funds[msg.sender] = funds[msg.sender].add(msg.value);
    }
}

