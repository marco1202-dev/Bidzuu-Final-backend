import { Request, Response } from 'express'
import { AuctionSimilarityRepository } from './repository.js'
import { GENERAL } from '../../constants/errors.js'

export class AuctionSimilaritiesController {
  public static async getRecommendations(req: Request, res: Response) {
    const { account } = res.locals
    const { page = 0, perPage = 20 } = req.body

    try {
      const auctions = await AuctionSimilarityRepository.getRecommendations(
        account,
        {
          page,
          perPage,
        }
      )

      return res.status(200).json(auctions)
    } catch (error) {
      console.error('Cannot get recommendations', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getSimilarAuctions(req: Request, res: Response) {
    const { auctionId, page = 0, perPage = 20 } = req.body

    try {
      const auctions = await AuctionSimilarityRepository.getSimilarAuctions(
        auctionId,
        {
          page,
          perPage,
        }
      )

      return res.status(200).json(auctions)
    } catch (error) {
      console.error('Cannot get similar auctions', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
