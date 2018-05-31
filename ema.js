'use strict'

class EMA {
	constructor(samplePoints, initialValue) {
		this._value = parseFloat(initialValue);
		this._samplePoints = samplePoints;
	}

	get value() {
		return this._value;
	}

	addSamplePoint(sample) {
		let multiplier = 2 / (this._samplePoints + 1);
		this._value = ((sample - this._value) * multiplier) + this._value;
	}	
}

module.exports = EMA;