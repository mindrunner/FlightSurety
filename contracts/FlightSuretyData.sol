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
        uint256 timestamp;
    }

    uint private airlineCount = 0;
    uint private next_insurance = 0;

    mapping(bytes32 => Flight) private flights;
    bytes32[] private flight_keys = new bytes32[](0);
    mapping(address => Airline) private airlines;
    mapping(uint => Insurance) private insurances;
    address[] private insurees = new address[](0);
    mapping(address => uint256) private payouts;
    mapping(address => uint256) private funds;
    mapping(address => uint256) private authorizedContracts;

    uint256 public constant MAX_INSURANCE_POLICY = 1 ether;
    uint256 public constant AIRLINE_MIN_FUNDS = 10 ether;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event InsureeCredited(address insuree, uint credit, uint total);


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
        _;
    }

    // Define a modifier that checks the price and refunds the remaining balance
    modifier checkAndRefund(address insuree) {
        _;
        if (msg.value > MAX_INSURANCE_POLICY) {
            uint amountToReturn = msg.value.sub(MAX_INSURANCE_POLICY);
            payouts[insuree] = payouts[insuree].add(amountToReturn);
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

    function getFlights() external view returns (string[] memory, address[] memory, uint256[] memory) {
        uint l = flight_keys.length;
        string[] memory names = new string[](l);
        address[] memory airline_addr = new address[](l);
        uint256[] memory timestamps = new uint256[](l);

        for (uint i = 0; i < l; ++i) {
            bytes32 key = flight_keys[i];
            names[i] = flights[key].name;
            airline_addr[i] = flights[key].airline;
            timestamps[i] = flights[key].timestamp;
        }

        return (names, airline_addr, timestamps);
    }

    function isAirlineRegistered(address wallet) external view returns (bool) {
        return airlines[wallet].isRegistered;
    }

    function isAirlineFunded(address wallet) external view returns (bool) {
        return funds[wallet] >= AIRLINE_MIN_FUNDS;
    }

    function isFlightRegistered(string memory name, uint256 timestamp, address airline) public view returns (bool) {
        bytes32 id = getFlightKey(airline, name, timestamp);
        return flights[id].isRegistered;
    }

    function registerFlight(string calldata name, uint256 timestamp, address airline) external isCallerAuthorized {
        bool registered = isFlightRegistered(name, timestamp, airline);
        require(!registered, "Flight is already registered");
        bytes32 id = getFlightKey(airline, name, timestamp);
        require(!flights[id].isRegistered, "Flight is already registered.");
        flights[id].name = name;
        flights[id].isRegistered = true;
        flights[id].airline = airline;
        flights[id].statusCode = 0;
        flights[id].timestamp = timestamp;
        flight_keys.push(id);
    }

    function updateFlight(string calldata name, uint256 timestamp, address airline, uint8 statusCode)
    external isCallerAuthorized {
        bytes32 id = getFlightKey(airline, name, timestamp);
        require(flights[id].isRegistered, "Flight is not registered.");
        flights[id].statusCode = statusCode;
    }




    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy
    (
        string calldata flight,
        uint256 timestamp,
        address airline,
        address insuree
    )
    external
    payable
    isCallerAuthorized
    paidInRange
    checkAndRefund(insuree)
    {
        bytes32 id = getFlightKey(airline, flight, timestamp);
        require(flights[id].isRegistered, "Flight does not exist");

        uint insurance_value = 0;

        if (msg.value >= MAX_INSURANCE_POLICY) {
            insurance_value = MAX_INSURANCE_POLICY;
        } else {
            insurance_value = msg.value;
        }

        insurances[next_insurance].flight = flights[id];
        insurances[next_insurance].customer = insuree;
        insurances[next_insurance].value = insurance_value;
        next_insurance = next_insurance.add(1);
        insurees.push(insuree);
    }


    event debug(uint i, address insuree, bytes32 id, address airline, string flight, uint256 ftimestamp, uint256 value);


    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(string calldata flight, uint256 timestamp, address airline)
    external
    {
        bytes32 id = getFlightKey(airline, flight, timestamp);
        for (uint i = 0; i < insurees.length; ++i) {
            address insuree = insurances[i].customer;
            bytes32 id2 = getFlightKey(insurances[i].flight.airline, insurances[i].flight.name, insurances[i].flight.timestamp);
            emit debug(i, insurances[i].customer, id, airline, flight, timestamp, 0);
            emit debug(i, insurances[i].customer, id2, insurances[i].flight.airline, insurances[i].flight.name, insurances[i].flight.timestamp, insurances[i].value);
            if(insurances[i].value == 0) continue;
            if (id == id2) {
                uint256 value = insurances[i].value;
                uint256 half = value.div(2);
                insurances[i].value = 0;
                uint256 refund = value.add(half);
                payouts[insuree] = payouts[insuree].add(refund);
                emit InsureeCredited(insuree, refund, payouts[insuree]);
            }
        }
    }

    function checkFunds() external view returns (uint){
        return payouts[msg.sender];
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
    (
        address payable insuree
    )
    external
    isCallerAuthorized
    {
        uint refund = payouts[insuree];
        payouts[insuree] = 0;
        insuree.transfer(refund);
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

