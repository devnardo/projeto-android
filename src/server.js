require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { insertPayment, updatePayment, getPaymentById, listPayments, nowIso } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function generateId(prefix) {
	return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// Health
app.get('/health', (req, res) => {
	res.json({ status: 'ok', time: nowIso() });
});

// Create a payment intent (mock provider by default)
app.post('/api/payments', (req, res) => {
	const { description = 'Compra', amount, currency = 'BRL', provider = 'mock' } = req.body || {};
	if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
		return res.status(400).json({ error: 'Amount inválido' });
	}
	const amount_cents = Math.round(Number(amount) * 100);
	const id = generateId('pay');
	const client_secret = generateId('secret');

	insertPayment({
		id,
		description,
		amount_cents,
		currency,
		status: 'requires_confirmation',
		provider,
		external_id: null,
		client_secret,
		created_at: nowIso(),
		updated_at: nowIso(),
	});

	res.status(201).json({
		id,
		client_secret,
		amount_cents,
		currency,
		status: 'requires_confirmation',
	});
});

// Confirm a payment (mock success)
app.post('/api/payments/:id/confirm', (req, res) => {
	const { id } = req.params;
	const payment = getPaymentById(id);
	if (!payment) {
		return res.status(404).json({ error: 'Pagamento não encontrado' });
	}
	if (payment.status === 'succeeded') {
		return res.json({ id: payment.id, status: payment.status });
	}
	updatePayment(id, { status: 'succeeded' });
	const updated = getPaymentById(id);
	res.json({ id: updated.id, status: updated.status });
});

// Retrieve a payment
app.get('/api/payments/:id', (req, res) => {
	const payment = getPaymentById(req.params.id);
	if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado' });
	res.json(payment);
});

// List payments
app.get('/api/payments', (req, res) => {
	res.json(listPayments());
});

// Serve index
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
	console.log(`Servidor iniciado em http://localhost:${PORT}`);
});