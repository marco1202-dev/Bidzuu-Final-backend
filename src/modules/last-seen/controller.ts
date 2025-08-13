import { Request, Response } from 'express'
import { GENERAL } from '../../constants/errors.js'
import { LastSeenAuctionsRepository } from './repository.js'

export class LastSeenAuctionsController {
  public static async getLastSeenByAccount(req: Request, res: Response) {
    const { page = 0, perPage = 10 } = req.params

    try {
      const lastSeenAuctions = await LastSeenAuctionsRepository.getLastSeenByAccount(
        res.locals.account.id,
        {
          page: parseInt(page.toString()),
          perPage: parseInt(perPage.toString()),
        }
      )

      return res.status(200).json(lastSeenAuctions)
    } catch (error) {
      console.error('Cannot get last seen auctions', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async storeLastSeen(req: Request, res: Response) {
    const { auctionId } = req.body

    try {
      await LastSeenAuctionsRepository.storeLastSeenAuction(res.locals.account.id, auctionId)

      return res.status(200).send()
    } catch (error) {
      console.error('Cannot store last seen auction', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
