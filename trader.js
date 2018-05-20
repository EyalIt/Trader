'use strict'

const util = require('util')
const request = require('request');

let longTerm = { "type" : "Long", "threshold" : 50, "total" : 0, "data" : [], "value" : 0 };
let shortTerm = { "type" : "Short", "threshold" : 10, "total" : 0, "data" : [], "value" : 0 };
let exponential = { "type" : "Exponential", "threshold": 10, "value" : 0 };
let trend = {"isShortAboveLong": false, "numSamples" : 0, "threshold" : 3};
let shoudLog = false;

let bank = { "deposit" : 1000, "tokens" : 0, "transactions" : [], };

function log(message) {
	if (shoudLog == true) {
		console.log(message);
	}
}

function setShouldlog(value) {
	shoudLog = value;
}
 
function get_price(currencyType) {
	let url = util.format('https://www.bitstamp.net/api/v2/ticker/%s/', currencyType);

	request(url, { json: true }, (err, res, body) => {
		if (err) { 
			return log(err); 
		}

		let price = body.last;
		let timestamp = body.timestamp;
		log("Timestamp: " + timestamp + ", Price: " + price);

		updateMovingAverages(price);
		setTimeout(get_price, 2000, currencyType);

	});
} 

function updateMovingAverages(price) {
	setTimeout(calculateMovingAverage, 1, price, longTerm);
	setTimeout(calculateMovingAverage, 1, price, shortTerm);
	setTimeout(calculateExponentialMovingAverage, 1, price, exponential);
	setTimeout(calculateCrossover, 2, shortTerm, longTerm, price, trend);
}

function calculateMovingAverage(price, mvObj) {
	price = parseFloat(parseFloat(price).toFixed(2));
	let totalPrices = mvObj.data.push(price);

	mvObj.total += price;
	if (totalPrices > mvObj.threshold) {
		let first = mvObj.data.shift();
		mvObj.total -= first;
		totalPrices--;
	}

	mvObj.total = parseFloat(mvObj.total.toFixed(2));
	mvObj.value = parseFloat((mvObj.total / totalPrices).toFixed(2));
	log(mvObj.type + " Term Moving Average: " + mvObj.value);
}

function calculateExponentialMovingAverage(price, exponential) {
	let multiplier = 2 / (exponential.threshold + 1);
	exponential.value = ((price - exponential.value) * multiplier) + exponential.value;
	exponential.value = parseFloat(exponential.value.toFixed(2));
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

function init(currencyType) {
	let url = util.format('https://www.bitstamp.net/api/v2/ticker/%s/', currencyType);

	request(url, { json: true }, (err, res, body) => {
		if (err) { 
			return console.log(err); 
		}

		let price = body.last;
		let timestamp = body.timestamp;
		log("Timestamp: " + timestamp + ", Price: " + price);

		exponential.value = parseFloat(parseFloat(price).toFixed(2));;
	});
}

async function main() {
	// initialize
	//setShouldlog(true);
	await init('btcusd');

	get_price('btcusd');
}


main();