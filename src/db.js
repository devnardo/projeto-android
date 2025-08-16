const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'payments.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS payments (
	id TEXT PRIMARY KEY,
	description TEXT,
	amount_cents INTEGER NOT NULL,
	currency TEXT NOT NULL,
	status TEXT NOT NULL,
	provider TEXT NOT NULL,
	external_id TEXT,
	client_secret TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
`);

function nowIso() {
	return new Date().toISOString();
}

function insertPayment(payment) {
	const stmt = db.prepare(`
		INSERT INTO payments (id, description, amount_cents, currency, status, provider, external_id, client_secret, created_at, updated_at)
		VALUES (@id, @description, @amount_cents, @currency, @status, @provider, @external_id, @client_secret, @created_at, @updated_at)
	`);
	stmt.run({
		...payment,
		created_at: payment.created_at || nowIso(),
		updated_at: payment.updated_at || nowIso(),
	});
}

function updatePayment(id, updates) {
	const fields = Object.keys(updates);
	if (fields.length === 0) return;
	const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
	const stmt = db.prepare(`UPDATE payments SET ${setClause}, updated_at = @updated_at WHERE id = @id`);
	stmt.run({ id, ...updates, updated_at: nowIso() });
}

function getPaymentById(id) {
	const stmt = db.prepare(`SELECT * FROM payments WHERE id = ?`);
	return stmt.get(id);
}

function listPayments() {
	const stmt = db.prepare(`SELECT * FROM payments ORDER BY datetime(created_at) DESC`);
	return stmt.all();
}

module.exports = {
	db,
	insertPayment,
	updatePayment,
	getPaymentById,
	listPayments,
	nowIso,
};