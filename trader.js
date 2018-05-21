'use strict'

const util = require('util')
const request = require('request');
const crypto = require('crypto');

let longTerm = { "type" : "Long", "threshold" : 50, "total" : 0, "data" : [], "value" : 0 };
let shortTerm = { "type" : "Short", "threshold" : 10, "total" : 0, "data" : [], "value" : 0 };
let exponential = { "type" : "Exponential", "threshold": 10, "value" : 0 };
let trend = {"isShortAboveLong": false, "numSamples" : 0, "threshold" : 3};
let shoudLog = false;

//let currency = 'xrpusd'; 
let currency = 'btcusd';
let bank = { "deposit" : 1000, "tokens" : 0, "transactions" : [] };


/* Log related APIs */
function log(message) {
	if (shoudLog == true) {
		console.log(message);
	}
}

function setShouldlog(value) {
	shoudLog = value;
}


 
/* Server related APIs */ 
function getPrice(currencyType) {
	let url = util.format('https://www.bitstamp.net/api/v2/ticker/%s/', currencyType);

	request(url, { json: true }, (err, res, body) => {
		if (err) { 
			return console.log(err); 
		}

		let price = body.last;
		let timestamp = body.timestamp;
		log("Timestamp: " + timestamp + ", Price: " + price);

		updateMovingAverages(price);
		setTimeout(getPrice, 2000, currencyType);
	});
} 

function getAccountBalance(currencyType) {
	let url = util.format('https://www.bitstamp.net/api/v2/balance/%s/', currencyType);
	let body = generateReqParams();

	request.post({
  		headers: {'content-type' : 'application/x-www-form-urlencoded'},
  		url:     url,
  		body:    body
	}, function(err, res, body) {
		if (err) { 
			return console.log(err); 
		}

  		console.log(body);
	});
}

function buyLimit(currencyType, price, amount) {
	let url = util.format('https://www.bitstamp.net/api/v2/buy/%s/', currencyType);
	let body = generateReqParams();
	body += {"amount" : amount, "price" : price, "limit_price" : price??, "daily_order" : true, "ioc_order" : true };

	request.post({
  		headers: {'content-type' : 'application/x-www-form-urlencoded'},
  		url:     url,
  		body:    body
	}, function(err, res, body) {
		if (err) { 
			return console.log(err); 
		}

  		console.log(body);
	});
}

function sellLimit(currencyType, price, amount) {
	let url = util.format('https://www.bitstamp.net/api/v2/sell/%s/', currencyType);
	let body = generateReqParams();
	body += {"amount" : amount, "price" : price, "limit_price" : price??, "daily_order" : true, "ioc_order" : true };

	request.post({
  		headers: {'content-type' : 'application/x-www-form-urlencoded'},
  		url:     url,
  		body:    body
	}, function(err, res, body) {
		if (err) { 
			return console.log(err); 
		}

  		console.log(body);
	});
}

function generateReqParams() {
	let apiKey = '';
	let customerId = '';
	let nonce = Math.floor(new Date() / 1000);

	let message = nonce + customerId + apiKey;
	let secret = '';
	let hmac = crypto.createHmac('sha256', secret);

	// perform the signature algorithm
	hmac.update(message);
	let signature = hmac.digest('hex').toUpperCase();

	return { "key" : apiKey, "signature" : signature, "nonce" : nonce };
}

async function init(currencyType) {
	let url = util.format('https://www.bitstamp.net/api/v2/ticker/%s/', currencyType);

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
	log(mvObj.type + " Term Moving Average: " + mvObj.value);
}

function calculateExponentialMovingAverage(price, exponential) {
	let multiplier = 2 / (exponential.threshold + 1);
	exponential.value = ((price - exponential.value) * multiplier) + exponential.value;
	exponential.value = parseFloat(exponential.value);
	log(exponential.type + " Moving Average: " + exponential.value);
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
	if (bank.deposit > 0) {
		bank.tokens = bank.deposit / price;
		bank.deposit -= (price * bank.tokens);
		setShouldlog(true);
		log("Buying at price = " + price + ". Total tokens = " + bank.tokens + ". Deposit is " + bank.deposit + " USD.");
		setShouldlog(false);		
	}
}

function sell(price) {
	if (bank.tokens > 0) { 
		bank.deposit = bank.tokens * price;
		bank.tokens -= (bank.deposit / price);
		setShouldlog(true);
		log("Selling at price = " + price + ". Total tokens = " + bank.tokens + ". Deposit is " + bank.deposit + " USD.");
		setShouldlog(false);	
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

async function run() {
	// initialize
	//setShouldlog(true);
	await init(currency);

	getPrice(currency);
}


module.exports.run = run;
module.exports.generateGraph = generateGraph;
module.exports.cancelAllTransactions = cancelAllTransactions;
