'use strict'

const util = require('util');


const Bitstamp = require('./bitstamp');
let trader = new Bitstamp();
let currency = 'btcusd';

/*
const Robinhood = require('./robinhood');
let trader = new Robinhood();
let currency = 'WDC';
*/


const SMA = require('./sma');
let sma = new SMA(10, "Short");
let lma = new SMA(50, "Long");

let exponential = { "type" : "Exponential", "threshold": 10, "value" : 0 };
let trend = {"isShortAboveLong": false, "numSamples" : 0, "threshold" : 3};


//let currency = 'WDC';
let bank = { "deposit" : 1000, "limit" : 1000, "tokens" : 0, "inPosition" : false };

let isDemo = true;



async function init() {
	await trader.getPrice(currency, function(price) {
		exponential.value = parseFloat(price);
	});
}



/* Moving average related functions */
function updateMovingAverages(price) {
	sma.addSamplePoint(price);
	lma.addSamplePoint(price);

	setTimeout(calculateExponentialMovingAverage, 1, price, exponential);
	setTimeout(calculateCrossover, 2, sma, lma, price, trend);
}

function calculateExponentialMovingAverage(price, exponential) {
	let multiplier = 2 / (exponential.threshold + 1);
	exponential.value = ((price - exponential.value) * multiplier) + exponential.value;
	exponential.value = parseFloat(exponential.value);
	//console.log(exponential.type + " Moving Average: " + exponential.value);
}

function calculateCrossover(sma, lma, price, trend) {
	let isShortAboveLong = sma.value > lma.value;

	if (trend.isShortAboveLong != isShortAboveLong) {
		trend.numSamples++;

		if (trend.numSamples > trend.threshold) {
			trend.isShortAboveLong = isShortAboveLong;	
			trend.numSamples = 0;		
			setTimeout(decideWhetherToInvest, 1, trend.isShortAboveLong, price);
		}
	}
}



/* Trade decision functions */
function decideWhetherToInvest(isShortAboveLong, price) {
	if (isShortAboveLong == false) {
		buy(price);
	} else {
		sell(price);
	}
}

function buy(price) {
	if (bank.inPosition == false) {
		bank.tokens = Math.min(bank.deposit, bank.limit) / price;
		bank.deposit -= (price * bank.tokens);
		bank.inPosition = true;
		console.log("Buying at price = " + price + ". Total tokens = " + bank.tokens + ". Deposit is " + bank.deposit + " USD.");

		if (isDemo == false) {
			trader.buy(currency, price, bank.tokens, function(err, res, body) {
				if (err) {
					bank.inPosition = false;
					return console.log(err);
				}

				trader.getAccountBalance(currency, function(err, res, body) {
					if (err) {
						return console.log(err);
					}

					let tokens = parseFloat(body.btc_balance);

					// make sure the buy order was made
					if (tokens != bank.tokens) {
						bank.inPosition = false;
						return;
					}

					bank.deposit = Math.min(parseFloat(body.usd_balance), bank.limit);
					console.log("Made a purchase at price = " + price + ". Total tokens = " + bank.tokens + ". Deposit is " + bank.deposit + " USD.");
				});
			});		
		}
	}
}

function sell(price) {
	if (bank.inPosition == true) { 
		bank.deposit += (price * bank.tokens);
		bank.tokens = 0;
		bank.inPosition = false;
		console.log("Selling at price = " + price + ". Total tokens = " + bank.tokens + ". Deposit is " + bank.deposit + " USD.");

		if (isDemo == false) {
			trader.sell(currency, price, bank.tokens, function(err, res, body) {
				if (err) {
					bank.inPosition = true;
					console.log(err);
					console.log("Sell Error");
					process.exit();
				}

				trader.getAccountBalance(currency, function(err, res, body) {
					if (err) {
						return console.log(err);
					}

					let tokens = parseFloat(body.btc_balance);
					
					// make sure the buy order was made
					if (tokens != bank.tokens) {
						bank.inPosition = true;
						console.log("Sell Verification Error: " + tokens + " " + bank.tokens);
						process.exit();
					}

					bank.deposit = Math.min(parseFloat(body.usd_balance), bank.limit);
					console.log("Made a sell at price = " + price + ". Total tokens = " + bank.tokens + ". Deposit is " + bank.deposit + " USD.");
				});
			});		
		}
	}
}



/* Internal server related functions */
function generateGraph() {
	let res = util.inspect(lma, false, null) + "\n\n";
	res += util.inspect(sma, false, null) + "\n\n";
	res += util.inspect(trend, false, null) + "\n\n";
	res += util.inspect(bank, false, null) + "\n\n";

	return res;
}

function cancelAllTransactions() {
	return "success\n";
}

function defaultCallback(err, res, body) {
	if (err) { 
		console.log(err); 
	} else {
		console.log(body);
	}
}

function loop() {
	trader.getPrice(currency, function(price) {
		updateMovingAverages(price);
	});

	setTimeout(loop, 2000);
}

async function run() {
	// initialize
	await init();
	console.log("Initialized");

	if (isDemo == false) {
		trader.getAccountBalance(currency, defaultCallback);
		//buyLimit(8390, 0.001, defaultCallback);
		//sellLimit(8400, 0.001, defaultCallback);		
	}

	setTimeout(loop, 2000);
}


module.exports.run = run;
module.exports.generateGraph = generateGraph;
module.exports.cancelAllTransactions = cancelAllTransactions;
