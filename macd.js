'use strict'

class MACD {
	constructor(samplePoints) {
		this._samplePoints = samplePoints;
		this._data = [];
		this._latestValue = 0;
		this._angleDeg = 0;

		this._angleThreshold = 30;

		this._trendThreshold = 3;
		this._numOfUpTrend = 0;
		this._numOfDownTrend = 0;
	}

	calculate(short, long) {
		let diff = short - long;
		let numOfSamples = this._data.push(diff);

		if (numOfSamples > this._samplePoints) {
			this._data.shift();
		}

		if (/*diff > 0 && */diff > this._latestValue) {
			this._numOfUpTrend++;
			this._numOfDownTrend = 0;
		} 
		if (diff < this._latestValue) {
			this._numOfDownTrend++;
			this._numOfUpTrend = 0;
		}

		// see if there is a trend
		this._angleDeg = Math.atan2(diff - this._latestValue, 2) * 180 / Math.PI;
		//console.log(short, long, diff, this._latestValue, this._angleDeg);

		this._latestValue = diff;
	}

	isTrendStrong() {
		return Math.abs(this._angleDeg) > this._angleThreshold;
	}

	isOnTheUprise() {
		return this._numOfUpTrend > this._trendThreshold;
	}

	isOnTheDownfall() {
		return this._numOfDownTrend > this._trendThreshold;
	}
}

module.exports = MACD;