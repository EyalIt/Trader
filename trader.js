'use strict'

const util = require('util');


const Bitstamp = require('./bitstamp');
let trader = new Bitstamp();
let currency = 'btcusd'; //'btceur'; 

/*
const Robinhood = require('./robinhood');
let trader = new Robinhood();
let currency = 'WDC';
*/


const SMA = require('./sma');
let sma = new SMA(10, "Short");
let lma = new SMA(50, "Long");

const EMA = require('./ema');
let emas;
let emal;

let trend = {"isShortAboveLong": false, "numSamples" : 0, "threshold" : 3};
const MACD = require('./MACD');
let macd = new MACD(10);

//let currency = 'WDC';
let bank = { "deposit" : 1000, "limit" : 1000, "tokens" : 0, "inPosition" : false, "tradeNumber" : 0, "fee" : 0.25 };

let isDemo = true;
let sellPrice = 0;


async function init() {
	await trader.getPrice(currency, function(price) {
		emas = new EMA(10, price);
		emal = new EMA(100, price);
	});
}



/* Moving average related functions */
function updateMovingAverages(price) {
	let sample = parseFloat(price);

	sma.addSamplePoint(sample);
	lma.addSamplePoint(sample);
	emas.addSamplePoint(sample);
	emal.addSamplePoint(sample);

	setTimeout(decideWhetherToInvest, 1, sample);
}

function calculateCrossover(price, short, long) {
	let isShortAboveLong = short > long;

	if (trend.isShortAboveLong != isShortAboveLong) {
		trend.numSamples++;

		if (trend.numSamples > trend.threshold) {
			trend.isShortAboveLong = isShortAboveLong;	
			trend.numSamples = 0;		
			
			// invest (-1 = sell, 1 = buy)
			if (trend.isShortAboveLong == true) {
 				return -1;
			} else {
				return 1;
			}
		}
	} else {
		trend.numSamples = 0;
	}

	return 0;
}


/* Trade decision functions */
function decideWhetherToInvest(price) {
	/*
	let isCrossover = calculateCrossover(price, sma.value, lma.value);
	if (isCrossover != 0) {
		return invest(isCrossover == 1, price);
	}
	*/

	macd.calculate(sma.value, lma.value);
	if (macd.isOnTheUprise()) {
		return invest(true, price);
	}

	if (sellPrice > 0 && sellPrice < price) {
		invest(false, price);
		sellPrice = 0;
	}
}

function invest(isBuy, price) {
	if (isBuy == true) {	
		buy(price);
	} else {
		sell(price);
	}

	bank.tradeNumber++;
}

function calculateFee(investment) {
	return (bank.fee * investment) / 100;
}

function buy(price) {
	if (bank.inPosition == false) {
		let investment = Math.min(bank.deposit, bank.limit);
		let fee = calculateFee(investment);
		//console.log("Transaction fee is " + fee + " USD.");

		sellPrice = price + ((4 * fee * investment) / 100);
		console.log("Sell Price: " + sellPrice);

		bank.tokens = investment / price;
		bank.deposit -= (price * bank.tokens);
		bank.inPosition = true;
		console.log("#" + bank.tradeNumber + ": Buying at price = " + price + ". Total tokens = " + bank.tokens + ". Deposit is " + bank.deposit + " USD.");

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
		let investment = price * bank.tokens;
		let fee = calculateFee(investment);
		//console.log("Transaction fee is " + fee + " USD.");

		bank.deposit += investment;
		bank.tokens = 0;
		bank.inPosition = false;
		console.log("#" + bank.tradeNumber + ": Selling at price = " + price + ". Total tokens = " + bank.tokens + ". Deposit is " + bank.deposit + " USD.");

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
