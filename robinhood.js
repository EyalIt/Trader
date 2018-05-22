'use strict'

const util = require('util');
const request = require('request');


class Robinhood {
	constructor() {
	}

	getPrice(quote, callback) {
		let url = util.format('https://api.robinhood.com/quotes/%s/', quote);

		request(url, { json: true }, (err, res, body) => {
			if (err) { 
				return console.log(err); 
			} 

			let price = body.last_trade_price;
			//console.log("Price: " + price);

			callback(price);
		});
	}

	getAccountBalance(quote, callback) {
		let url = util.format('https://www.bitstamp.net/api/v2/balance/%s/', quote);
		let body = generateReqParams();

		request.post({
	  		headers: {'Content-type' : 'application/json'},
	  		url:     url,
	  		json: 	 true,
	  		form:    body
		}, callback);
	}

	buy(quote, price, amount, callback) {
		let url = util.format('https://www.bitstamp.net/api/v2/buy/%s/', quote);
		let body = generateReqParams();
		body = Object.assign(body, {"amount" : amount, "price" : price, "daily_order" : true, "ioc_order" : true });

		request.post({
	  		headers: {'Content-type' : 'application/json'},
	  		url:     url,
	  		json: 	 true,
	  		form:    body
		}, callback);
	}

 	sell(quote, price, amount, callback) {
		let url = util.format('https://www.bitstamp.net/api/v2/sell/%s/', quote);
		let body = generateReqParams();
		body = Object.assign(body, {"amount" : amount, "price" : price, "daily_order" : true, "ioc_order" : true });

		request.post({
	  		headers: {'Content-type' : 'application/json'},
	  		url:     url,
	  		json: 	 true,
	  		form:    body
		}, callback);
	}

	generateReqParams() {
		return "";
	}
}

module.exports = Robinhood;