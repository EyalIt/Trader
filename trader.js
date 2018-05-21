'use strict'

const util = require('util')
const request = require('request');
const crypto = require('crypto');

let longTerm = { "type" : "Long", "threshold" : 50, "total" : 0, "data" : [], "value" : 0 };
let shortTerm = { "type" : "Short", "threshold" : 10, "total" : 0, "data" : [], "value" : 0 };
let exponential = { "type" : "Exponential", "threshold": 10, "value" : 0 };
let trend = {"isShortAboveLong": false, "numSamples" : 0, "threshold" : 3};

//let currency = 'xrpusd'; 
let currency = 'btcusd';
let bank = { "deposit" : 1000, "limit" : 1000, "tokens" : 0, "inPosition" : false };

let debugLogs = false;
let isDemo = true;

// secrets




/* Log related APIs */
function log(message) {
	if (debugLogs == true) {
		console.log(message);
	}
}

 
/* Server related APIs */ 
function getPrice() {
	let url = util.format('https://www.bitstamp.net/api/v2/ticker/%s/', currency);

	request(url, { json: true }, (err, res, body) => {
		if (err) { 
			console.log(err); 
		} else {
			let price = body.last;
			let timestamp = body.timestamp;
			log("Timestamp: " + timestamp + ", Price: " + price);

			updateMovingAverages(price);
		}
		setTimeout(getPrice, 2000);
	});
} 

function getAccountBalance(callback) {
	let url = util.format('https://www.bitstamp.net/api/v2/balance/%s/', currency);
	let body = generateReqParams();

	request.post({
  		headers: {'Content-type' : 'application/json'},
  		url:     url,
  		json: 	 true,
  		form:    body
	}, callback);
}

function buyLimit(price, amount, callback) {
	let url = util.format('https://www.bitstamp.net/api/v2/buy/%s/', currency);
	let body = generateReqParams();
	body = Object.assign(body, {"amount" : amount, "price" : price, "daily_order" : true, "ioc_order" : true });

	request.post({
  		headers: {'Content-type' : 'application/json'},
  		url:     url,
  		json: 	 true,
  		form:    body
	}, callback);
}

function sellLimit(price, amount, callback) {
	let url = util.format('https://www.bitstamp.net/api/v2/sell/%s/', currency);
	let body = generateReqParams();
	body = Object.assign(body, {"amount" : amount, "price" : price, "daily_order" : true, "ioc_order" : true });

	request.post({
  		headers: {'Content-type' : 'application/json'},
  		url:     url,
  		json: 	 true,
  		form:    body
	}, callback);
}

function generateReqParams() {
	let nonce = Math.floor(new Date() / 1);

	let message = nonce + customerId + apiKey;
	let hmac = crypto.createHmac('sha256', secret);

	// perform the signature algorithm
	hmac.update(message);
	let signature = hmac.digest('hex').toUpperCase();

	return { "key" : apiKey, "signature" : signature, "nonce" : nonce };
}

async function init() {
	let url = util.format('https://www.bitstamp.net/api/v2/ticker/%s/', currency);

	await request(url, { json: true }, (err, res, body) => {
		if (err) { 
			return console.log(err); 
		}

		let price = body.last;
		let timestamp = body.timestamp;
		log("Timestamp: " + timestamp + ", Price: " + price);

		exponential.value = parseFloat(price);
	});
}




/* Moving average related functions */
function updateMovingAverages(price) {
	setTimeout(calculateMovingAverage, 1, price, longTerm);
	setTimeout(calculateMovingAverage, 1, price, shortTerm);
	setTimeout(calculateExponentialMovingAverage, 1, price, exponential);
	setTimeout(calculateCrossover, 2, shortTerm, longTerm, price, trend);
}

function calculateMovingAverage(price, mvObj) {
	price = parseFloat(price);
	let totalPrices = mvObj.data.push(price);

	mvObj.total += price;
	if (totalPrices > mvObj.threshold) {
		let first = mvObj.data.shift();
		mvObj.total -= first;
		totalPrices--;
	}

	mvObj.total = parseFloat(mvObj.total);
	mvObj.value = parseFloat(mvObj.total / totalPrices);
	//log(mvObj.type + " Term Moving Average: " + mvObj.value);
}

function calculateExponentialMovingAverage(price, exponential) {
	let multiplier = 2 / (exponential.threshold + 1);
	exponential.value = ((price - exponential.value) * multiplier) + exponential.value;
	exponential.value = parseFloat(exponential.value);
	//log(exponential.type + " Moving Average: " + exponential.value);
}

function calculateCrossover(shortTerm, longTerm, price, trend) {
	let isShortAboveLong = parseFloat(shortTerm.value) > parseFloat(longTerm.value);

	if (trend.isShortAboveLong != isShortAboveLong) {
		trend.numSamples++;

		if (trend.numSamples > trend.threshold) {
			//console.log(shortTerm.data);
			//console.log(longTerm.data);

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
			buyLimit(price, bank.tokens, function(err, res, body) {
				if (err) {
					bank.inPosition = false;
					return console.log(err);
				}

				getAccountBalance(function(err, res, body) {
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
		bank.deposit += bank.tokens * price;
		bank.tokens -= (Math.min(bank.deposit, bank.limit) / price);
		bank.inPosition = false;
		console.log("Selling at price = " + price + ". Total tokens = " + bank.tokens + ". Deposit is " + bank.deposit + " USD.");

		if (isDemo == false) {
			sellLimit(price, bank.tokens, function(err, res, body) {
				if (err) {
					bank.inPosition = true;
					console.log(err);
					console.log("Sell Error");
					process.exit();
				}

				getAccountBalance(function(err, res, body) {
					if (err) {
						return console.log(err);
					}

					let tokens = parseFloat(body.btc_balance);
					
					// make sure the buy order was made
					if (tokens != bank.tokens) {
						bank.inPosition = true;
						console.log("Sell Verification Error");
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
	let res = util.inspect(longTerm, false, null) + "\n\n";
	res += util.inspect(shortTerm, false, null) + "\n\n";
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

async function run() {
	// initialize
	await init();
	log("Initialized");

	if (isDemo == false) {
		getAccountBalance(defaultCallback);
		//buyLimit(8390, 0.001, defaultCallback);
		//sellLimit(8400, 0.001, defaultCallback);		
	}

	getPrice();
}


module.exports.run = run;
module.exports.generateGraph = generateGraph;
module.exports.cancelAllTransactions = cancelAllTransactions;
