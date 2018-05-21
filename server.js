'use strict'

const trader = require('./trader.js');
const express = require('express');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', (req, res) => {
  	res.send('Hello world\n');
});

app.get('/graph', (req, res) => {
	let graph = trader.generateGraph();
  	res.send(graph);
});

app.get('/cancel', (req, res) => {
	let result = trader.cancelAllTransactions();
  	res.send(result);
});

app.listen(PORT, HOST);
trader.run();