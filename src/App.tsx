import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type ExpenseType = 'expense' | 'income'

type Expense = {
  id: string
  type: ExpenseType
  date: string
  merchant: string
  category: string
  amount: number
  payment: string
  branch: string
  note: string
}

type ExpenseForm = Omit<Expense, 'id' | 'amount'> & {
  amount: string
}

const STORAGE_KEY = 'yigiter-harcama-raporu-v1'

const categories = [
  'Malzeme',
  'Nakliye',
  'Personel',
  'Ofis',
  'Yemek',
  'Bakim',
  'Satis',
  'Diger',
]

const paymentMethods = ['Nakit', 'Kredi Karti', 'Banka', 'Cari', 'Diger']
const branches = ['Merkez', 'Depo', 'Saha', 'Online']

const today = new Date().toISOString().slice(0, 10)

const emptyForm: ExpenseForm = {
  type: 'expense',
  date: today,
  merchant: '',
  category: 'Malzeme',
  amount: '',
  payment: 'Banka',
  branch: 'Merkez',
  note: '',
}

const sampleExpenses: Expense[] = [
  {
    id: 'sample-1',
    type: 'expense',
    date: today,
    merchant: 'Kereste nakliye',
    category: 'Nakliye',
    amount: 8400,
    payment: 'Banka',
    branch: 'Depo',
    note: 'Sevkiyat araci',
  },
  {
    id: 'sample-2',
    type: 'expense',
    date: today,
    merchant: 'Ofis sarf',
    category: 'Ofis',
    amount: 1260,
    payment: 'Kredi Karti',
    branch: 'Merkez',
    note: 'Aylik ihtiyac',
  },
  {
    id: 'sample-3',
    type: 'income',
    date: today,
    merchant: 'Tahsilat',
    category: 'Satis',
    amount: 32500,
    payment: 'Banka',
    branch: 'Merkez',
    note: 'Pesin tahsilat',
  },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function makeId() {
  return `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    try {
      const parsed = JSON.parse(raw) as Expense[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [form, setForm] = useState<ExpenseForm>(emptyForm)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Tumu')
  const [branchFilter, setBranchFilter] = useState('Tumu')
  const [typeFilter, setTypeFilter] = useState<'all' | ExpenseType>('all')

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR')

    return expenses
      .filter((expense) => {
        const matchesQuery =
          !needle ||
          `${expense.merchant} ${expense.category} ${expense.note}`
            .toLocaleLowerCase('tr-TR')
            .includes(needle)
        const matchesCategory = categoryFilter === 'Tumu' || expense.category === categoryFilter
        const matchesBranch = branchFilter === 'Tumu' || expense.branch === branchFilter
        const matchesType = typeFilter === 'all' || expense.type === typeFilter

        return matchesQuery && matchesCategory && matchesBranch && matchesType
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [branchFilter, categoryFilter, expenses, query, typeFilter])

  const totals = useMemo(() => {
    const income = filteredExpenses
      .filter((expense) => expense.type === 'income')
      .reduce((sum, expense) => sum + expense.amount, 0)
    const expense = filteredExpenses
      .filter((item) => item.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0)

    return {
      income,
      expense,
      balance: income - expense,
      count: filteredExpenses.length,
      average: filteredExpenses.length ? expense / filteredExpenses.length : 0,
    }
  }, [filteredExpenses])

  const categoryTotals = useMemo(() => {
    const grouped = filteredExpenses
      .filter((expense) => expense.type === 'expense')
      .reduce<Record<string, number>>((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount
        return acc
      }, {})

    return Object.entries(grouped)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredExpenses])

  const monthlyTotals = useMemo(() => {
    const grouped = expenses.reduce<Record<string, { income: number; expense: number }>>(
      (acc, expense) => {
        const month = expense.date.slice(0, 7)
        acc[month] = acc[month] || { income: 0, expense: 0 }
        acc[month][expense.type] += expense.amount
        return acc
      },
      {},
    )

    return Object.entries(grouped)
      .map(([month, value]) => ({ month, ...value }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
  }, [expenses])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(form.amount.replace(',', '.'))

    if (!form.merchant.trim() || !Number.isFinite(amount) || amount <= 0) return

    const nextExpense: Expense = {
      ...form,
      id: makeId(),
      merchant: form.merchant.trim(),
      note: form.note.trim(),
      amount,
    }

    setExpenses((current) => [nextExpense, ...current])
    setForm({ ...emptyForm, date: form.date, branch: form.branch, payment: form.payment })
  }

  function removeExpense(id: string) {
    setExpenses((current) => current.filter((expense) => expense.id !== id))
  }

  function exportCsv() {
    const header = ['Tarih', 'Tip', 'Firma/Aciklama', 'Kategori', 'Tutar', 'Odeme', 'Sube', 'Not']
    const rows = filteredExpenses.map((expense) => [
      expense.date,
      expense.type === 'income' ? 'Gelir' : 'Gider',
      expense.merchant,
      expense.category,
      expense.amount,
      expense.payment,
      expense.branch,
      expense.note,
    ])
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `harcama-raporu-${today}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const maxCategoryAmount = Math.max(...categoryTotals.map((item) => item.amount), 1)
  const maxMonthlyAmount = Math.max(
    ...monthlyTotals.map((item) => Math.max(item.income, item.expense)),
    1,
  )

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Yigiter Finans</p>
          <h1>Harcama Raporu</h1>
        </div>
        <div className="topbar-actions" aria-label="Veri islemleri">
          <button type="button" className="ghost-button" onClick={() => setExpenses(sampleExpenses)}>
            Ornek Veri
          </button>
          <button type="button" className="primary-button" onClick={exportCsv} disabled={!filteredExpenses.length}>
            CSV Indir
          </button>
        </div>
      </header>

      <section className="summary-grid" aria-label="Ozet">
        <article className="metric metric-income">
          <span>Gelir</span>
          <strong>{formatCurrency(totals.income)}</strong>
        </article>
        <article className="metric metric-expense">
          <span>Gider</span>
          <strong>{formatCurrency(totals.expense)}</strong>
        </article>
        <article className="metric metric-balance">
          <span>Net</span>
          <strong>{formatCurrency(totals.balance)}</strong>
        </article>
        <article className="metric">
          <span>Kayit</span>
          <strong>{totals.count}</strong>
        </article>
      </section>

      <section className="workspace">
        <form className="entry-panel" onSubmit={handleSubmit}>
          <div className="section-heading">
            <h2>Yeni Kayit</h2>
            <span>{formatCurrency(totals.average)} ortalama gider</span>
          </div>

          <div className="segmented-control" aria-label="Kayit tipi">
            <button
              type="button"
              className={form.type === 'expense' ? 'active' : ''}
              onClick={() => setForm((current) => ({ ...current, type: 'expense' }))}
            >
              Gider
            </button>
            <button
              type="button"
              className={form.type === 'income' ? 'active' : ''}
              onClick={() => setForm((current) => ({ ...current, type: 'income' }))}
            >
              Gelir
            </button>
          </div>

          <label>
            Tarih
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
          </label>

          <label>
            Firma / Aciklama
            <input
              value={form.merchant}
              placeholder="Orn. Akaryakit, nakliye, tahsilat"
              onChange={(event) => setForm((current) => ({ ...current, merchant: event.target.value }))}
            />
          </label>

          <div className="two-column">
            <label>
              Kategori
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Tutar
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                placeholder="0"
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              />
            </label>
          </div>

          <div className="two-column">
            <label>
              Odeme
              <select
                value={form.payment}
                onChange={(event) => setForm((current) => ({ ...current, payment: event.target.value }))}
              >
                {paymentMethods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </label>
            <label>
              Sube
              <select
                value={form.branch}
                onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))}
              >
                {branches.map((branch) => (
                  <option key={branch}>{branch}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Not
            <textarea
              value={form.note}
              rows={3}
              placeholder="Fiş no, aciklama veya teslimat bilgisi"
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            />
          </label>

          <button type="submit" className="primary-button full-width">
            Kaydi Ekle
          </button>
        </form>

        <section className="report-panel">
          <div className="section-heading report-heading">
            <div>
              <h2>Kayitlar</h2>
              <span>{filteredExpenses.length} satir listeleniyor</span>
            </div>
            <div className="filters">
              <input
                type="search"
                value={query}
                placeholder="Ara"
                onChange={(event) => setQuery(event.target.value)}
              />
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | ExpenseType)}>
                <option value="all">Tum Tipler</option>
                <option value="expense">Gider</option>
                <option value="income">Gelir</option>
              </select>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option>Tumu</option>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                <option>Tumu</option>
                {branches.map((branch) => (
                  <option key={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="insight-grid">
            <div className="chart-block">
              <h3>Kategori Dagilimi</h3>
              <div className="bar-list">
                {categoryTotals.length ? (
                  categoryTotals.map((item) => (
                    <div className="bar-row" key={item.category}>
                      <span>{item.category}</span>
                      <div className="bar-track">
                        <div style={{ width: `${(item.amount / maxCategoryAmount) * 100}%` }} />
                      </div>
                      <strong>{formatCurrency(item.amount)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="empty-copy">Gider kaydi yok.</p>
                )}
              </div>
            </div>

            <div className="chart-block">
              <h3>Aylik Akis</h3>
              <div className="month-chart">
                {monthlyTotals.length ? (
                  monthlyTotals.map((item) => (
                    <div className="month-column" key={item.month}>
                      <div className="month-bars">
                        <span
                          className="income-bar"
                          style={{ height: `${Math.max((item.income / maxMonthlyAmount) * 100, 4)}%` }}
                        />
                        <span
                          className="expense-bar"
                          style={{ height: `${Math.max((item.expense / maxMonthlyAmount) * 100, 4)}%` }}
                        />
                      </div>
                      <small>{item.month.slice(5)}</small>
                    </div>
                  ))
                ) : (
                  <p className="empty-copy">Aylik veri yok.</p>
                )}
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Tip</th>
                  <th>Firma / Aciklama</th>
                  <th>Kategori</th>
                  <th>Odeme</th>
                  <th>Sube</th>
                  <th className="amount-cell">Tutar</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length ? (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatDate(expense.date)}</td>
                      <td>
                        <span className={`type-pill ${expense.type}`}>{expense.type === 'income' ? 'Gelir' : 'Gider'}</span>
                      </td>
                      <td>
                        <strong>{expense.merchant}</strong>
                        {expense.note && <small>{expense.note}</small>}
                      </td>
                      <td>{expense.category}</td>
                      <td>{expense.payment}</td>
                      <td>{expense.branch}</td>
                      <td className="amount-cell">{formatCurrency(expense.amount)}</td>
                      <td>
                        <button type="button" className="icon-button" onClick={() => removeExpense(expense.id)} aria-label="Kaydi sil">
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="empty-table">
                      Henuz kayit yok. Ilk harcamayi sol panelden ekleyebilirsin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
