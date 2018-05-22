'use strict'

const util = require('util');
const request = require('request');
const crypto = require('crypto');

class Bitstamp {
	constructor() {
		// secrets

	}

	getPrice(quote, callback) {
		let url = util.format('https://www.bitstamp.net/api/v2/ticker/%s/', quote);

		request(url, { json: true }, (err, res, body) => {
			if (err) { 
				return console.log(err); 
			} 
				
			let price = body.last;
			let timestamp = body.timestamp;
			//console.log("Timestamp: " + timestamp + ", Price: " + price);

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
		let nonce = Math.floor(new Date() / 1);

		let message = nonce + this._customerId + this._apiKey;
		let hmac = crypto.createHmac('sha256', this._secret);

		// perform the signature algorithm
		hmac.update(message);
		let signature = hmac.digest('hex').toUpperCase();

		return { "key" : this._apiKey, "signature" : signature, "nonce" : nonce };
	}
}

module.exports = Bitstamp;