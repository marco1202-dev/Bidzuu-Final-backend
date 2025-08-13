import { Attributes, FindOptions, Op } from 'sequelize'
import { Asset } from '../../modules/assets/model.js'
import { AuctionAsset } from '../../modules/auxiliary-models/auction-assets.js'
import { Auction } from '../../modules/auctions/model.js'
import { Bid } from '../../modules/bids/model.js'
import { Account } from '../../modules/accounts/model.js'
import { Payment } from '../../modules/payments/model.js'
import sequelize from 'sequelize'
import dayjs from 'dayjs'

export const loadAssetsForAuctions = async (auctionIds: string[]) => {
  auctionIds = [].concat(auctionIds)
  const auctionWithAssets = await AuctionAsset.findAll({
    where: { auctionId: { [Op.in]: auctionIds } },
    include: { model: Asset, as: 'asset' },
  })

  return auctionWithAssets.map((el) => {
    return { auctionId: el.auctionId, asset: el.asset.toJSON() }
  })
}

export const loadDashboardData = async () => {
  const [auctionsCount, bidsCount, accountsCount, paymentsCount] =
    await Promise.all([
      Auction.count(),
      Bid.count(),
      Account.count(),
      Payment.count(),
    ])

  const startOfYear = dayjs().startOf('year').toDate()
  const endOfYear = dayjs().endOf('year').toDate()

  const QUERY_PER_MONTH = {
    attributes: [
      [
        sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')),
        'month',
      ],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: {
      createdAt: {
        [Op.between]: [startOfYear, endOfYear],
      },
    },
    group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
    order: [
      [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'ASC'],
    ],
  }

  const [auctionsPerMonth, accountsPerMonth, paymentsPerMonth, bidsPerMonth] =
    await Promise.all([
      Auction.findAll(
        QUERY_PER_MONTH as unknown as FindOptions<Attributes<Auction>>
      ),
      Account.findAll(
        QUERY_PER_MONTH as unknown as FindOptions<Attributes<Account>>
      ),
      Payment.findAll(
        QUERY_PER_MONTH as unknown as FindOptions<Attributes<Payment>>
      ),
      Bid.findAll(QUERY_PER_MONTH as unknown as FindOptions<Attributes<Bid>>),
    ])

  const auctionsPerMonthFormatted = auctionsPerMonth.map((el) => {
    return {
      count: el.get('count'),
      month: dayjs(el.get('month') as string).format('MMMM'),
    }
  })

  const accountsPerMonthFormatted = accountsPerMonth.map((el) => {
    return {
      count: el.get('count'),
      month: dayjs(el.get('month') as string).format('MMMM'),
    }
  })

  const paymentsPerMonthFormatted = paymentsPerMonth.map((el) => {
    return {
      count: el.get('count'),
      month: dayjs(el.get('month') as string).format('MMMM'),
    }
  })

  const bidsPerMonthFormatted = bidsPerMonth.map((el) => {
    return {
      count: el.get('count'),
      month: dayjs(el.get('month') as string).format('MMMM'),
    }
  })

  return {
    auctionsCount,
    bidsCount,
    accountsCount,
    paymentsCount,
    accountsPerMonth: accountsPerMonthFormatted,
    paymentsPerMonth: paymentsPerMonthFormatted,
    auctionsPerMonth: auctionsPerMonthFormatted,
    bidsPerMonth: bidsPerMonthFormatted,
  }
}
