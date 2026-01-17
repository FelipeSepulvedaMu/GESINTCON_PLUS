
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// Datos iniciales si la base de datos no existe
const INITIAL_DATA = {
  houses: Array.from({ length: 158 }, (_, i) => ({
    id: `house-${i + 1}`,
    number: `${i + 1}`,
    ownerName: `Propietario Casa ${i + 1}`,
    rut: `${Math.floor(Math.random() * 10000000 + 10000000)}-${Math.floor(Math.random() * 9)}`,
    phone: `+56 9 ${Math.floor(Math.random() * 90000000 + 10000000)}`,
    email: `casa${i + 1}@condominio.cl`,
    hasParking: false,
  })),
  payments: [],
  meetings: [],
  expenses: [],
  employees: [
    { id: 'emp-1', name: 'Pedro Alvarado', rut: '15.421.903-k', entryDate: '2022-01-15', role: 'Conserje' },
    { id: 'emp-2', name: 'Ana María Rojas', rut: '18.231.554-2', entryDate: '2023-05-20', role: 'Administradora' },
  ],
  vacations: [],
  leaves: [],
  fees: [
    { id: '1', name: 'Gasto Común', defaultAmount: 50000, startMonth: 0, startYear: 2024 },
    { id: '2', name: 'Estacionamiento', defaultAmount: 15000, startMonth: 0, startYear: 2024 },
    { id: '3', name: 'Aguinaldo Septiembre', defaultAmount: 10000, startMonth: 8, startYear: 2024, applicableMonths: [8] },
    { id: '4', name: 'Aguinaldo Diciembre', defaultAmount: 10000, startMonth: 11, startYear: 2024, applicableMonths: [11] },
  ]
};

// Cargar o inicializar DB
let db = INITIAL_DATA;
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error("Error leyendo DB, usando inicial.");
  }
}

const saveDB = () => {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

// --- ENDPOINTS ---

// HOUSES
app.get('/api/houses', (req, res) => res.json(db.houses));
app.put('/api/houses/:id', (req, res) => {
  const index = db.houses.findIndex(h => h.id === req.params.id);
  if (index !== -1) {
    db.houses[index] = { ...db.houses[index], ...req.body };
    saveDB();
    res.json(db.houses[index]);
  } else res.status(404).send();
});

// PAYMENTS
app.get('/api/payments', (req, res) => res.json(db.payments));
app.post('/api/payments', (req, res) => {
  const payment = { id: Date.now().toString(), ...req.body };
  db.payments.push(payment);
  saveDB();
  res.json(payment);
});

// MEETINGS
app.get('/api/meetings', (req, res) => res.json(db.meetings));
app.post('/api/meetings', (req, res) => {
  const meeting = { id: Date.now().toString(), ...req.body };
  db.meetings.unshift(meeting);
  saveDB();
  res.json(meeting);
});

// EXPENSES
app.get('/api/expenses', (req, res) => res.json(db.expenses));
app.post('/api/expenses', (req, res) => {
  const expense = { id: Date.now().toString(), ...req.body };
  db.expenses.push(expense);
  saveDB();
  res.json(expense);
});
app.delete('/api/expenses/:id', (req, res) => {
  db.expenses = db.expenses.filter(e => e.id !== req.params.id);
  saveDB();
  res.send();
});

// PERSONNEL
app.get('/api/employees', (req, res) => res.json(db.employees));
app.post('/api/employees', (req, res) => {
  const emp = { id: 'emp-' + Date.now(), ...req.body };
  db.employees.push(emp);
  saveDB();
  res.json(emp);
});

app.get('/api/vacations', (req, res) => res.json(db.vacations));
app.post('/api/vacations', (req, res) => {
  const v = { id: Date.now().toString(), ...req.body };
  db.vacations.push(v);
  saveDB();
  res.json(v);
});

app.get('/api/leaves', (req, res) => res.json(db.leaves));
app.post('/api/leaves', (req, res) => {
  const l = { id: Date.now().toString(), ...req.body };
  db.leaves.push(l);
  saveDB();
  res.json(l);
});

// FEES (CONFIG)
app.get('/api/fees', (req, res) => res.json(db.fees));
app.put('/api/fees/:id', (req, res) => {
  const index = db.fees.findIndex(f => f.id === req.params.id);
  if (index !== -1) {
    db.fees[index] = { ...db.fees[index], ...req.body };
    saveDB();
    res.json(db.fees[index]);
  } else res.status(404).send();
});
app.post('/api/fees', (req, res) => {
  const fee = { id: Date.now().toString(), ...req.body };
  db.fees.push(fee);
  saveDB();
  res.json(fee);
});
app.delete('/api/fees/:id', (req, res) => {
  db.fees = db.fees.filter(f => f.id !== req.params.id);
  saveDB();
  res.send();
});

app.listen(PORT, () => {
  console.log(`CondoMaster Backend corriendo en http://localhost:${PORT}`);
});
