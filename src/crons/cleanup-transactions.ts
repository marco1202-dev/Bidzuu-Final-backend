// This cron will run every 30 minutes, checking if there are any
// loose transactions that have not been closed yet. If so, it will
// close them
import { schedule } from 'node-cron'
import { DatabaseConnection } from '../database/index.js'

export const runCleanupTransactionsCron = () => {
  closeLooseTransactions()

  schedule('*/1 * * * *', () => {
    console.log('Running transactions cleanup cron')
    closeLooseTransactions()
  })
}

const closeLooseTransactions = async () => {
  try {
    const [results] = await DatabaseConnection.getInstance().query(
      `
      SELECT pid, age(clock_timestamp(), xact_start) as duration
      FROM pg_stat_activity
      WHERE state = 'active'
      AND xact_start IS NOT NULL
      AND age(clock_timestamp(), xact_start) > interval '5 minutes'
  `,
      { raw: true }
    )

    results.push({ pid: 'test' })

    if (results.length > 0) {
      console.log(`Found ${results.length} long-running transactions.`)
      for (const row of results) {
        console.log(`Terminating transaction with PID: ${row.pid}`)

        await DatabaseConnection.getInstance().query(`SELECT pg_cancel_backend(${row.pid})`, {
          raw: true,
        })
      }
    } else {
      console.log('No long-running transactions found.')
    }
  } catch (error) {
    console.error('Error in cleanup transactions cron', error)
  }
}
