'use strict'

class SMA {
	constructor(samplePoints, name) {
		this._samplePoints = samplePoints;
		this._value = 0;
		this._sum = 0;
		this._data = [];
		this._name = name;
	}

	get name() {
		return this._name;
	}

	get value() {
		return this._value;
	}

	addSamplePoint(sample) {
		//console.log(this._data);
		let samplePoint = parseFloat(sample);
		let numOfSamples = this._data.push(samplePoint);

		this._sum += samplePoint;
		if (numOfSamples > this._samplePoints) {
			let first = this._data.shift();
			this._sum -= first;
			numOfSamples--;
		}

		this._value = parseFloat(this._sum / numOfSamples);
	}
}

module.exports = SMA;